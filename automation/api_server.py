"""
IntelliDex Flask API Server
Bridges the trained Multi-Task Transformer model with the React UI.

Endpoints - ML Predictions:
  GET /api/health            - Model status, data freshness, accuracy
  GET /api/predictions       - 7-horizon ML predictions (Prediction[] shape)
  GET /api/model-performance - Real accuracy metrics from training results

Endpoints - Security Monitoring:
  GET  /api/security/generate-test-transactions      - Generate & analyze test transactions
  POST /api/security/analyze-transaction              - Analyze single transaction with trained ML model
  POST /api/security/log-alert                        - Log security alert to blockchain
  GET  /api/security/alerts/<address>                 - Get alerts for wallet address
  GET  /api/security/high-risk-wallets               - Get high-risk wallets
  GET  /api/security/recent-alerts                   - Get recent blockchain alerts

Endpoints - Trade Execution Monitoring (SEPARATE blockchain ledger):
  POST /api/trading/log-execution                     - Log trade execution (manual or bot-driven)
  GET  /api/trading/get-executions                   - Get trades for security monitor
  GET  /api/trading/bot-performance                  - Get bot performance metrics
  GET  /api/trading/execution-statistics             - Get execution statistics by symbol

Features:
  - TWO separate blockchain systems:
    * PACKAGE A: Predictions logging + verification
    * PACKAGE E: Trade execution logging + security monitoring
  - Auto hot-reload: detects when nightly training overwrites .pth / .pkl
  - 5-minute prediction cache (invalidated on model file change)
  - CORS for localhost Vite dev server
  - Lazy model loading (fast startup)
  - ML fraud detector (Isolation Forest) trained on Bitcoin data
"""

import os
import time
import pickle
import logging
import traceback
from datetime import datetime, timedelta
from functools import lru_cache

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from flask import Flask, jsonify
from flask_cors import CORS

# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────────

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR    = os.path.dirname(os.path.dirname(BASE_DIR))

import sys
sys.path.insert(0, PROJECT_DIR)
from blockchain.PACKAGE_A_blockchain_logger import PredictionBlockchainLogger
from blockchain.PACKAGE_A_ipfs_storage import IPFSPredictionManager
from blockchain.PACKAGE_C_deploy import SmartContractManager

# Blockchain services
blockchain_logger = PredictionBlockchainLogger(db_path=os.path.join(BASE_DIR, "prediction_verification.db"))
ipfs_manager = IPFSPredictionManager(use_local_node=False)
contract_manager = SmartContractManager(network="local")

MODEL_PATH     = os.path.join(BASE_DIR, "best_multi_task_transformer.pth")
SCALER_PATH    = os.path.join(BASE_DIR, "multi_task_scaler.pkl")
DATA_PATH      = os.path.join(BASE_DIR, "btc_unified_data.csv")
PERF_LOG_PATH  = os.path.join(BASE_DIR, "performance_log.csv")
PRED_CSV_PATH  = os.path.join(BASE_DIR, "multi_task_predictions.csv")

CACHE_TTL      = 5 * 60   # 5 minutes in seconds
PORT           = 5001

# ─── Model Architecture (must match training script exactly) ──────────────────

class PositionalEncoding(nn.Module):
    """Positional encoding to inject sequence order information"""
    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super(PositionalEncoding, self).__init__()
        self.dropout = nn.Dropout(p=dropout)
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


class MultiHeadAttention(nn.Module):
    """Multi-head self-attention mechanism"""
    def __init__(self, d_model, num_heads, dropout=0.1):
        super(MultiHeadAttention, self).__init__()
        assert d_model % num_heads == 0
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)
    
    def split_heads(self, x, batch_size):
        x = x.view(batch_size, -1, self.num_heads, self.d_k)
        return x.permute(0, 2, 1, 3)
    
    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)
        Q = self.W_q(query)
        K = self.W_k(key)
        V = self.W_v(value)
        Q = self.split_heads(Q, batch_size)
        K = self.split_heads(K, batch_size)
        V = self.split_heads(V, batch_size)
        scores = torch.matmul(Q, K.transpose(-2, -1)) / np.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        attention = F.softmax(scores, dim=-1)
        attention = self.dropout(attention)
        context = torch.matmul(attention, V)
        context = context.permute(0, 2, 1, 3).contiguous()
        context = context.view(batch_size, -1, self.d_model)
        output = self.W_o(context)
        return output


class FeedForward(nn.Module):
    """Position-wise feed-forward network"""
    def __init__(self, d_model, d_ff, dropout=0.1):
        super(FeedForward, self).__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.GELU()
    
    def forward(self, x):
        x = self.linear1(x)
        x = self.activation(x)
        x = self.dropout(x)
        x = self.linear2(x)
        return x


class TransformerEncoderLayer(nn.Module):
    """Single transformer encoder layer"""
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super(TransformerEncoderLayer, self).__init__()
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
    
    def forward(self, x, mask=None):
        attn_output = self.self_attention(x, x, x, mask)
        x = self.norm1(x + self.dropout1(attn_output))
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout2(ff_output))
        return x


class MultiTaskTransformer(nn.Module):
    """Transformer for Price & Direction"""
    def __init__(self, input_dim, d_model=128, num_heads=8, num_layers=4, 
                 d_ff=512, dropout=0.2, max_seq_length=100):
        super().__init__()
        self.input_dim = input_dim
        self.d_model = d_model
        
        self.input_projection = nn.Sequential(
            nn.Linear(input_dim, d_model),
            nn.LayerNorm(d_model)
        )
        self.pos_encoder = PositionalEncoding(d_model, dropout, max_seq_length)
        
        self.encoder_layers = nn.ModuleList([
            TransformerEncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        self.norm = nn.LayerNorm(d_model)
        
        # Shared feature extraction
        self.shared_fc1 = nn.Linear(d_model, d_model // 2)
        self.shared_fc2 = nn.Linear(d_model // 2, d_model // 4)
        
        # TASK 1: Price Prediction (Regression)
        self.price_head = nn.Sequential(
            nn.Linear(d_model // 4, d_model // 8),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 8, 1)
        )
        # TASK 2: Direction Prediction (Binary Classification)
        self.direction_head = nn.Sequential(
            nn.Linear(d_model // 4, d_model // 8),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 8, 1),
            nn.Sigmoid()
        )
        
        # Skip connections
        self.price_skip = nn.Linear(d_model, 1)
        self.direction_skip = nn.Sequential(
            nn.Linear(d_model, 1),
            nn.Sigmoid()
        )
        
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.GELU()
        
    def forward(self, x, mask=None):
        x = self.input_projection(x)
        x = self.pos_encoder(x)
        for layer in self.encoder_layers:
            x = layer(x, mask)
        
        # Global average pooling
        x = x.mean(dim=1)
        x = self.norm(x)
        
        # Shared features
        shared = self.activation(self.shared_fc1(x))
        shared = self.dropout(shared)
        shared = self.activation(self.shared_fc2(shared))
        
        # Task 1: Price Prediction
        price_main = self.price_head(shared)
        price_skip_out = self.price_skip(x)
        price_out = 0.7 * price_main + 0.3 * price_skip_out
        
        # Task 2: Direction Prediction
        dir_main = self.direction_head(shared)
        dir_skip_out = self.direction_skip(x)
        dir_out = 0.7 * dir_main + 0.3 * dir_skip_out
        
        return price_out.squeeze(), dir_out.squeeze()


# ─── Model Manager (handles loading + hot-reload) ────────────────────────────

class ModelManager:
    def __init__(self):
        self.model           = None
        self.feature_scaler  = None
        self.price_scaler    = None
        self.feature_cols    = None
        self.seq_length      = None
        self.direction_acc   = None
        self.epoch           = None
        self.device          = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model_mtime    = 0.0
        self._loaded_at      = None

        # Prediction cache
        self._cached_preds   = None
        self._cache_ts       = 0.0

    def _model_file_changed(self) -> bool:
        """Returns True if .pth on disk is newer than what we loaded."""
        try:
            return os.path.getmtime(MODEL_PATH) > self._model_mtime
        except OSError:
            return False

    def _load(self):
        log.info("Loading model from %s ...", MODEL_PATH)
        ckpt = torch.load(MODEL_PATH, map_location=self.device)

        self.feature_cols  = ckpt["feature_cols"]
        self.seq_length    = ckpt["seq_length"]
        self.direction_acc = ckpt.get("direction_acc", 0.0)
        self.epoch         = ckpt.get("epoch", 0)

        with open(SCALER_PATH, "rb") as f:
            scalers = pickle.load(f)
        self.feature_scaler = scalers["feature_scaler"]
        self.price_scaler   = scalers["price_scaler"]

        input_dim = len(self.feature_cols)
        self.model = MultiTaskTransformer(
            input_dim=input_dim, d_model=128, num_heads=8,
            num_layers=4, d_ff=512, dropout=0.2,
            max_seq_length=self.seq_length
        ).to(self.device)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.eval()

        self._model_mtime = os.path.getmtime(MODEL_PATH)
        self._loaded_at   = datetime.utcnow()
        self._cached_preds = None  # invalidate cache after reload
        log.info("✓ Model loaded | Direction Acc: %.2f%% | epoch %s | device: %s",
                 self.direction_acc, self.epoch, self.device)

    def ensure_loaded(self):
        """Load or reload model if file has changed."""
        if self.model is None:
            self._load()
        elif self._model_file_changed():
            log.info("Model file changed — hot-reloading...")
            self._load()

    def _load_latest_sequence(self):
        """Read latest seq_length rows from the growing btc_unified_data.csv."""
        df = pd.read_csv(DATA_PATH)
        df["time"] = pd.to_datetime(df["time"])

        last_time  = df["time"].max()
        last_price = float(df["close"].iloc[-1])
        sentiment  = float(df["sentiment_mean"].iloc[-1]) if "sentiment_mean" in df.columns else 0.0

        X = df[self.feature_cols].tail(self.seq_length).values
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        X_scaled = self.feature_scaler.transform(X)

        return X_scaled, last_price, last_time, sentiment

    def get_predictions(self) -> list:
        """Return cached predictions or run inference and cache result."""
        self.ensure_loaded()

        now = time.time()

        # Return cache if fresh AND model hasn't changed
        if (self._cached_preds is not None
                and now - self._cache_ts < CACHE_TTL
                and not self._model_file_changed()):
            log.info("Returning cached predictions (age: %.0fs)", now - self._cache_ts)
            return self._cached_preds

        log.info("Running model inference...")
        seq, last_price, last_time, sentiment = self._load_latest_sequence()

        horizons = [
            (15,    "15 minutes"),
            (60,    "1 hour"),
            (240,   "4 hours"),
            (720,   "12 hours"),
            (1440,  "24 hours"),
            (4320,  "3 days"),
            (10080, "7 days"),
        ]
        # Confidence decreases with horizon
        base_conf = {15: 90, 60: 84, 240: 76, 720: 68, 1440: 62, 4320: 55, 10080: 50}

        results = []
        current_seq = seq.copy()

        with torch.no_grad():
            for minutes, name in horizons:
                inp = torch.FloatTensor(current_seq).unsqueeze(0).to(self.device)
                price_scaled, dir_prob = self.model(inp)

                predicted_price = float(self.price_scaler.inverse_transform(
                    price_scaled.cpu().numpy().reshape(-1, 1)
                )[0, 0])
                dir_prob_val = float(dir_prob.item())

                change      = predicted_price - last_price
                change_pct  = (change / last_price) * 100 if last_price else 0.0
                confidence  = base_conf.get(minutes, 55)
                direction   = "up" if dir_prob_val > 0.5 else "down"
                target_ts   = (datetime.utcnow() + timedelta(minutes=minutes)).isoformat() + "Z"
                now_ts      = datetime.utcnow().isoformat() + "Z"

                pred = {
                    "id":               f"ML-{int(time.time() * 1000)}-{minutes}",
                    "timestamp":        now_ts,
                    "horizon":          name,
                    "horizonMinutes":   minutes,
                    "currentPrice":     last_price,
                    "predictedPrice":   round(predicted_price, 2),
                    "change":           round(change, 2),
                    "changePercent":    round(change_pct, 4),
                    "confidence":       confidence,
                    "direction":        direction,
                    "directionProbability": round(dir_prob_val, 4),
                    "sentimentScore":   round(sentiment, 4),
                    "sentimentImpact":  round(sentiment * 0.2 * 100, 4),
                    "technicalIndicators": {
                        "rsi":         "50.0",
                        "macd":        "0.0",
                        "volumeTrend": 1.0,
                        "volatility":  round(abs(change_pct) / 10, 4)
                    },
                    "targetTimestamp":  target_ts,
                    "source":          "ml_model",
                }
                results.append(pred)

        # --- BLOCKCHAIN INTEGRATION ---
        try:
            # Convert results array into the format expected by blockchain_logger
            pred_dict = {}
            conf_dict = {}
            for r in results:
                hrz = str(r['horizonMinutes']) + "min"
                pred_dict[hrz] = r['predictedPrice']
                conf_dict[hrz] = r['confidence'] / 100.0

            log_result = blockchain_logger.log_prediction(
                current_price=last_price,
                predictions=pred_dict,
                confidence_scores=conf_dict,
                sentiment_score=sentiment,
                model_version=f"epoch-{self.epoch}"
            )
            
            if log_result.get("status") == "success":
                pred_id = log_result["prediction_id"]
                pred_hash = log_result["prediction_hash"]
                log.info("Blockchain Logger: Logged hash %s", pred_hash)

                # IPFS simulated upload
                exported = blockchain_logger.export_for_blockchain(pred_id)
                ipfs_res = ipfs_manager.store_prediction_with_logging(pred_id, exported["data"])
                cid = ipfs_res.get("cid", "")
                log.info("IPFS Logger: CID %s", cid)

                # Smart contract execution via local active node
                tx_hash = contract_manager.record_prediction_on_chain(
                    prediction_hash=pred_hash,
                    current_price=last_price,
                    ipfs_cid=cid
                )
                if tx_hash:
                    log.info("Blockchain: TX Hash %s", tx_hash)
                    # Update sqlite to include these hashes so UI can show them natively
                    import sqlite3
                    conn = sqlite3.connect(blockchain_logger.db_path)
                    conn.execute("UPDATE predictions SET blockchain_tx = ?, ipfs_cid = ? WHERE id = ?", (tx_hash, cid, pred_id))
                    conn.commit()
                    conn.close()

        except Exception as e:
            log.error("Blockchain Integration Error: %s", e)

        # Cache
        self._cached_preds = results
        self._cache_ts     = time.time()
        log.info("✓ Predictions cached | last_price=$%.2f", last_price)
        return results

    def get_data_info(self):
        """Return info about the latest data in btc_unified_data.csv."""
        try:
            df = pd.read_csv(DATA_PATH, usecols=["time", "close"])
            df["time"] = pd.to_datetime(df["time"])
            last_time  = df["time"].max()
            last_price = float(df["close"].iloc[-1])
            age_hours  = (datetime.utcnow() - last_time).total_seconds() / 3600
            return {
                "lastRow":    last_time.isoformat() + "Z",
                "lastPrice":  round(last_price, 2),
                "ageHours":   round(age_hours, 1),
                "totalRows":  len(df),
            }
        except Exception as e:
            return {"error": str(e)}

    def is_loaded(self) -> bool:
        return self.model is not None


# ─── Flask App ───────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app, origins=["http://localhost:*", "http://127.0.0.1:*",
                   "http://localhost:5173", "http://localhost:8080",
                   "http://localhost:3000"])

mgr = ModelManager()


@app.route("/api/health", methods=["GET"])
def health():
    """Model status, data freshness, accuracy info."""
    try:
        data_info = mgr.get_data_info()
        model_mtime = datetime.utcfromtimestamp(
            os.path.getmtime(MODEL_PATH)
        ).isoformat() + "Z" if os.path.exists(MODEL_PATH) else None

        return jsonify({
            "status":          "ok",
            "modelLoaded":     mgr.is_loaded(),
            "directionAccuracy": round(mgr.direction_acc, 2) if mgr.direction_acc else None,
            "modelVersion":    f"epoch-{mgr.epoch}" if mgr.epoch is not None else "unknown",
            "modelUpdatedAt":  model_mtime,
            "device":          str(mgr.device),
            "data":            data_info,
            "cacheAge":        round(time.time() - mgr._cache_ts) if mgr._cache_ts else None,
            "serverTime":      datetime.utcnow().isoformat() + "Z",
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route("/api/blockchain/logs", methods=["GET"])
def blockchain_logs():
    try:
        import sqlite3
        db_path = os.path.join(BASE_DIR, "prediction_verification.db")
        if not os.path.exists(db_path):
            return jsonify({"success": True, "logs": []})
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('''
            SELECT prediction_hash, timestamp, current_price, ipfs_cid, blockchain_tx
            FROM predictions 
            WHERE blockchain_tx IS NOT NULL
            ORDER BY id DESC LIMIT 10
        ''')
        rows = cursor.fetchall()
        conn.close()
        
        logs = []
        for r in rows:
            logs.append({
                "hash": r["prediction_hash"],
                "timestamp": r["timestamp"],
                "price": r["current_price"],
                "ipfs_cid": r["ipfs_cid"],
                "tx_hash": r["blockchain_tx"]
            })
            
        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        log.error("Blockchain logs error: %s\\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/predictions", methods=["GET"])
def predictions():
    """7-horizon ML predictions in Prediction[] shape compatible with React UI."""
    try:
        preds = mgr.get_predictions()
        return jsonify({
            "success": True,
            "source":  "ml_model",
            "count":   len(preds),
            "predictions": preds,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
        })
    except FileNotFoundError as e:
        return jsonify({
            "success": False,
            "error":   "Required model/data files not found",
            "detail":  str(e),
        }), 503
    except Exception as e:
        log.error("Prediction error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/model-performance", methods=["GET"])
def model_performance():
    """Real accuracy metrics from multi_task_predictions.csv + performance_log.csv."""
    try:
        result = {}

        # From multi_task_predictions.csv (test-set results)
        if os.path.exists(PRED_CSV_PATH):
            df = pd.read_csv(PRED_CSV_PATH)
            if "price_error" in df.columns and "actual_direction" in df.columns:
                price_error = df["price_error"].abs().mean()
                price_rmse  = float(np.sqrt((df["price_error"] ** 2).mean()))

                up_preds = df[df["predicted_direction"] == True]
                dn_preds = df[df["predicted_direction"] == False]

                dir_acc     = float((df["actual_direction"] == df["predicted_direction"]).mean() * 100)
                up_acc      = float((up_preds["actual_direction"] == True).mean() * 100) if len(up_preds) else 0.0
                down_acc    = float((dn_preds["actual_direction"] == False).mean() * 100) if len(dn_preds) else 0.0

                result.update({
                    "directionAccuracy": round(dir_acc, 2),
                    "upAccuracy":        round(up_acc,  2),
                    "downAccuracy":      round(down_acc, 2),
                    "mae":               round(float(price_error), 2),
                    "rmse":              round(price_rmse, 2),
                    "totalPredictions":  int(len(df)),
                })

        # From performance_log.csv (daily logs)
        if os.path.exists(PERF_LOG_PATH):
            log_df = pd.read_csv(PERF_LOG_PATH, header=None,
                                 names=["timestamp", "rmse", "directionAccuracy"])
            log_df["timestamp"] = pd.to_datetime(log_df["timestamp"], errors="coerce")
            log_df = log_df.dropna()
            if not log_df.empty:
                latest = log_df.iloc[-1]
                result["lastLogDate"]    = latest["timestamp"].isoformat() + "Z"
                result["loggedRmse"]     = round(float(latest["rmse"]), 2)
                result["loggedDirAcc"]   = round(float(latest["directionAccuracy"]), 2)
                result["logEntries"]     = int(len(log_df))

        # Model metadata
        if mgr.is_loaded():
            result["modelVersion"]   = f"epoch-{mgr.epoch}"
            result["trainedDirAcc"]  = round(mgr.direction_acc, 2) if mgr.direction_acc else None

        if os.path.exists(MODEL_PATH):
            mtime = datetime.utcfromtimestamp(os.path.getmtime(MODEL_PATH))
            result["modelLastTrained"] = mtime.isoformat() + "Z"

        return jsonify({"success": True, **result})

    except Exception as e:
        log.error("Performance error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/predictions/log-blockchain", methods=["POST"])
def log_predictions_blockchain():
    """
    Endpoint for manually logging current predictions to blockchain.
    Called every 15 minutes by the auto-update system.
    
    Expected request body:
    {
        "predictions": [...],  // Array of prediction objects
        "currentPrice": number,
        "timestamp": ISO string
    }
    """
    try:
        from flask import request
        data = request.get_json()
        
        if not data or 'predictions' not in data:
            return jsonify({"success": False, "error": "Missing predictions in request"}), 400
        
        predictions = data.get('predictions', [])
        current_price = data.get('currentPrice', 0)
        timestamp = data.get('timestamp', datetime.utcnow().isoformat() + "Z")
        
        # Convert predictions to the format expected by blockchain_logger
        pred_dict = {}
        conf_dict = {}
        
        for pred in predictions:
            hrz_key = f"{pred.get('horizonMinutes', 15)}min"
            pred_dict[hrz_key] = pred.get('predictedPrice', 0)
            conf_dict[hrz_key] = (pred.get('confidence', 50) / 100.0)
        
        # Log to blockchain
        log_result = blockchain_logger.log_prediction(
            current_price=current_price,
            predictions=pred_dict,
            confidence_scores=conf_dict,
            sentiment_score=data.get('sentimentScore', 0),
            model_version=f"epoch-{mgr.epoch}" if mgr.is_loaded() else "latest"
        )
        
        if log_result.get("status") != "success":
            return jsonify({"success": False, "error": "Failed to log prediction"}), 500
        
        pred_id = log_result["prediction_id"]
        pred_hash = log_result["prediction_hash"]
        log.info("✓ Blockchain Logger: Logged hash %s", pred_hash)
        
        # Upload to IPFS
        exported = blockchain_logger.export_for_blockchain(pred_id)
        ipfs_res = ipfs_manager.store_prediction_with_logging(pred_id, exported["data"])
        cid = ipfs_res.get("cid", "")
        log.info("✓ IPFS Logger: CID %s", cid)
        
        # Record on blockchain via smart contract
        tx_hash = contract_manager.record_prediction_on_chain(
            prediction_hash=pred_hash,
            current_price=current_price,
            ipfs_cid=cid
        )
        
        if tx_hash:
            log.info("✓ Blockchain: TX Hash %s", tx_hash)
            
            # Update database with blockchain hashes
            import sqlite3
            conn = sqlite3.connect(blockchain_logger.db_path)
            conn.execute("UPDATE predictions SET blockchain_tx = ?, ipfs_cid = ? WHERE id = ?", 
                        (tx_hash, cid, pred_id))
            conn.commit()
            conn.close()
            
            return jsonify({
                "success": True,
                "prediction_id": pred_id,
                "prediction_hash": pred_hash,
                "ipfs_cid": cid,
                "blockchain_tx": tx_hash,
                "timestamp": timestamp,
                "message": "Predictions successfully logged to blockchain network"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to record transaction on blockchain"
            }), 500
            
    except Exception as e:
        log.error("Blockchain logging error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/security/analyze-transaction", methods=["POST"])
def analyze_transaction_security():
    """
    Analyze a transaction or wallet for fraud risk using ML.
    Uses Isolation Forest anomaly detection + known pattern matching.
    
    Expected request body:
    {
        "transaction": {
            "from_address": "0x...",
            "to_address": "0x...",
            "value_eth": 10.5,
            "gas_price_gwei": 50,
            "timestamp": "ISO string"
        },
        "wallet_history": [...],  // Optional historical transactions
        "blockchain_context": {}   // Optional network context
    }
    """
    try:
        from flask import request
        from fraud_detection_service import fraud_detector
        from blockchain.PACKAGE_D_security_alerts import security_alert_logger
        
        data = request.get_json()
        
        if not data or 'transaction' not in data:
            return jsonify({"success": False, "error": "Missing transaction data"}), 400
        
        transaction = data.get('transaction', {})
        wallet_history = data.get('wallet_history', [])
        blockchain_context = data.get('blockchain_context', {})
        
        # Score the transaction
        analysis = fraud_detector.score_transaction(transaction, wallet_history, blockchain_context)
        
        # If risky enough, log to blockchain
        if analysis['risk_score'] >= 50:  # Medium risk or higher
            log_result = security_alert_logger.log_security_alert(
                transaction_hash=transaction.get('tx_hash'),
                wallet_address=transaction.get('from_address'),
                risk_score=analysis['risk_score'],
                severity=analysis['severity'],
                threat_type=analysis['threat_type'],
                threat_details=analysis.get('risk_components', {}),
                evidence=analysis.get('evidence', []),
                recommendations=analysis.get('recommendations', []),
                model_version="isolation_forest_v1"
            )
            
            if log_result['status'] == 'success':
                log.info("Security Alert Logged: %s (Risk: %d)", log_result['alert_id'], analysis['risk_score'])
                analysis['blockchain_logged'] = True
                analysis['alert_id'] = log_result['alert_id']
                analysis['alert_hash'] = log_result['alert_hash']
            
            # Update wallet risk profile
            security_alert_logger.update_wallet_risk_profile(
                transaction.get('from_address', ''),
                analysis['risk_score'],
                analysis['threat_type']
            )
        
        return jsonify({
            "success": True,
            "analysis": analysis,
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        })
    
    except Exception as e:
        log.error("Transaction analysis error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/security/log-alert", methods=["POST"])
def log_security_alert():
    """
    Log a security alert to blockchain.
    Called after fraud detection analysis.
    
    Expected request body:
    {
        "wallet_address": "0x...",
        "risk_score": 85,
        "severity": "CRITICAL",
        "threat_type": "FLASH_LOAN_ATTACK",
        "evidence": [...],
        "recommendations": [...]
    }
    """
    try:
        from flask import request
        from blockchain.PACKAGE_D_security_alerts import security_alert_logger
        
        data = request.get_json()
        
        if not data or 'wallet_address' not in data:
            return jsonify({"success": False, "error": "Missing wallet address"}), 400
        
        log_result = security_alert_logger.log_security_alert(
            wallet_address=data.get('wallet_address'),
            transaction_hash=data.get('transaction_hash'),
            risk_score=data.get('risk_score', 0),
            severity=data.get('severity', 'MEDIUM'),
            threat_type=data.get('threat_type', 'UNKNOWN'),
            threat_details=data.get('threat_details', {}),
            evidence=data.get('evidence', []),
            recommendations=data.get('recommendations', [])
        )
        
        if log_result['status'] == 'success':
            # Update wallet profile
            security_alert_logger.update_wallet_risk_profile(
                data.get('wallet_address'),
                data.get('risk_score', 0),
                data.get('threat_type', 'UNKNOWN')
            )
            
            log.info("Security Alert Recorded: %s (Risk: %d)", 
                    log_result['alert_id'], data.get('risk_score', 0))
            
            return jsonify({
                "success": True,
                "alert_id": log_result['alert_id'],
                "alert_hash": log_result['alert_hash'],
                "timestamp": log_result['timestamp'],
                "message": "Security alert recorded on blockchain network"
            })
        else:
            return jsonify({"success": False, "error": log_result.get('error')}), 500
    
    except Exception as e:
        log.error("Alert logging error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/security/alerts/<address>", methods=["GET"])
def get_wallet_alerts(address):
    """Get all security alerts for a specific wallet address"""
    try:
        from blockchain.PACKAGE_D_security_alerts import security_alert_logger
        
        alerts = security_alert_logger.get_wallet_alerts(address)
        
        return jsonify({
            "success": True,
            "wallet": address,
            "alerts": alerts,
            "alert_count": len(alerts)
        })
    
    except Exception as e:
        log.error("Get alerts error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/security/high-risk-wallets", methods=["GET"])
def get_high_risk_wallets():
    """Get list of high-risk wallets detected by ML"""
    try:
        from blockchain.PACKAGE_D_security_alerts import security_alert_logger
        
        min_score = float(request.args.get('min_score', 70))
        wallets = security_alert_logger.get_high_risk_wallets(min_score)
        
        return jsonify({
            "success": True,
            "high_risk_wallets": wallets,
            "wallet_count": len(wallets),
            "threshold": min_score
        })
    
    except Exception as e:
        log.error("High-risk wallets error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/security/recent-alerts", methods=["GET"])
def get_recent_security_alerts():
    """Get recent security alerts from blockchain"""
    try:
        from blockchain.PACKAGE_D_security_alerts import security_alert_logger
        
        limit = int(request.args.get('limit', 10))
        alerts = security_alert_logger.get_recent_alerts(limit)
        
        return jsonify({
            "success": True,
            "recent_alerts": alerts,
            "alert_count": len(alerts)
        })
    
    except Exception as e:
        log.error("Recent alerts error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/security/generate-test-transactions", methods=["GET"])
def generate_test_transactions():
    """
    Generate realistic test transactions and analyze with trained ML model
    Returns analyzed transactions with risk scores from the trained fraud detector
    
    Query params:
    - count: number of transactions to generate (default: 8)
    - include_anomalies: whether to include anomalous transactions (default: true)
    """
    try:
        from fraud_detection_service import fraud_detector
        from blockchain.PACKAGE_D_security_alerts import security_alert_logger
        
        count = int(request.args.get('count', 8))
        include_anomalies = request.args.get('include_anomalies', 'true').lower() == 'true'
        
        if not fraud_detector.is_trained:
            return jsonify({
                "success": False,
                "error": "Fraud detector model not trained. Run train_fraud_detector.py first.",
                "model_trained": False
            }), 503
        
        # Generate realistic test transactions
        transactions = []
        
        for i in range(count):
            # Mix normal and anomalous transactions
            is_anomaly = include_anomalies and i % 5 == 0  # ~20% anomalies
            
            if is_anomaly:
                # Generate anomalous transaction (high values, unusual patterns)
                tx = {
                    'from_address': f"0x{i:040x}",
                    'to_address': f"0x{(i+1):040x}",
                    'value_eth': np.random.uniform(500, 10000),  # Unusually high
                    'gas_price_gwei': np.random.uniform(200, 500),  # High gas price
                    'gas_limit': np.random.randint(1000000, 5000000),  # Large operations
                    'is_contract': 1,
                    'token_transfers': np.random.randint(10, 50),
                    'input_data_size': np.random.randint(500, 5000),
                    'is_internal': 0,
                    'timestamp': (datetime.utcnow() - timedelta(seconds=60*i)).isoformat(),
                }
            else:
                # Generate normal transaction
                tx = {
                    'from_address': f"0x{i:040x}",
                    'to_address': f"0x{(i+1):040x}",
                    'value_eth': np.random.uniform(0.1, 50),  # Normal range
                    'gas_price_gwei': np.random.uniform(20, 100),  # Normal gas
                    'gas_limit': np.random.randint(21000, 200000),  # Common operations
                    'is_contract': np.random.randint(0, 2),
                    'token_transfers': np.random.randint(0, 5),
                    'input_data_size': np.random.randint(0, 500),
                    'is_internal': np.random.randint(0, 2),
                    'timestamp': (datetime.utcnow() - timedelta(seconds=60*i)).isoformat(),
                }
            
            # Analyze transaction with trained model
            analysis = fraud_detector.score_transaction(tx)
            
            # Format for UI
            transactions.append({
                'hash': f"0x{np.random.randint(0, 2**256):064x}"[:66],
                'timestamp': tx['timestamp'],
                'from': tx['from_address'],
                'to': tx['to_address'],
                'amount': f"{tx['value_eth']:.4f}",
                'type': 'anomaly' if is_anomaly else 'normal',
                'riskScore': analysis['risk_score'],
                'status': analysis['severity'].lower(),
                'threatType': analysis['threat_type'],
                'evidence': analysis.get('evidence', []),
            })
            
            # Log alerts to blockchain if risk is significant
            if analysis['risk_score'] >= 70:
                try:
                    alert_result = security_alert_logger.log_security_alert(
                        transaction_hash=transactions[-1]['hash'],
                        wallet_address=tx['from_address'],
                        risk_score=analysis['risk_score'],
                        severity=analysis['severity'],
                        threat_type=analysis['threat_type'],
                        threat_details=analysis.get('risk_components', {}),
                        evidence=analysis.get('evidence', []),
                        model_version="isolation_forest_v1"
                    )
                    transactions[-1]['blockchain_logged'] = alert_result['status'] == 'success'
                except Exception as e:
                    log.warning(f"Could not log alert to blockchain: {e}")
                    transactions[-1]['blockchain_logged'] = False
        
        # Calculate statistics
        stats = {
            'critical': sum(1 for t in transactions if t['status'] == 'critical'),
            'high': sum(1 for t in transactions if t['status'] == 'high'),
            'medium': sum(1 for t in transactions if t['status'] == 'medium'),
            'safe': sum(1 for t in transactions if t['status'] == 'low'),
        }
        
        return jsonify({
            "success": True,
            "transactions": transactions,
            "alertStats": stats,
            "model_info": {
                "type": "Isolation Forest",
                "trained_on": "Bitcoin OHLCV Data (17,321 records)",
                "features": 21,
                "contamination": 0.05,
                "n_estimators": 100
            },
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        })
    
    except Exception as e:
        log.error("Generate test transactions error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/trading/log-execution", methods=["POST"])
def log_trade_execution():
    """
    Log a trade execution from user (manual or bot-driven) to blockchain
    For security monitoring analysis
    
    Expected request body:
    {
        "execution_id": "unique-id",
        "execution_type": "manual" | "grid_bot" | "trend_bot" | "swing_bot",
        "symbol": "BTCUSDT",
        "side": "buy" | "sell",
        "amount": 0.5,
        "price": 25000,
        "fee": 12.5,
        "position_id": "optional",
        "bot_id": "optional"
    }
    """
    try:
        from flask import request
        from blockchain.PACKAGE_E_trade_execution_logger import trade_execution_logger
        from fraud_detection_service import fraud_detector
        
        data = request.get_json()
        
        if not data or 'execution_id' not in data:
            return jsonify({"success": False, "error": "Missing execution_id"}), 400
        
        # Log execution to blockchain
        exec_result = trade_execution_logger.log_trade_execution(
            execution_id=data.get('execution_id'),
            execution_type=data.get('execution_type', 'manual'),
            symbol=data.get('symbol', 'BTCUSDT'),
            side=data.get('side'),
            amount=float(data.get('amount', 0)),
            price=float(data.get('price', 0)),
            fee=float(data.get('fee', 0)),
            from_address=data.get('from_address', ''),
            to_address=data.get('to_address', ''),
            position_id=data.get('position_id'),
            bot_id=data.get('bot_id'),
            pnl=float(data.get('pnl', 0)) if data.get('pnl') else None,
        )
        
        if exec_result['status'] == 'success':
            # Prepare for security analysis
            tx_for_analysis = {
                'from_address': data.get('from_address', f"user_{data.get('execution_id')[:8]}"),
                'to_address': data.get('to_address', 'trading_contract'),
                'value_eth': float(data.get('amount', 0)) * float(data.get('price', 0)) / 1000,
                'gas_price_gwei': float(data.get('fee', 0)) / 100,
                'gas_limit': int(float(data.get('amount', 0)) * 1000),
                'is_contract': 1 if data.get('execution_type', '').endswith('_bot') else 0,
                'token_transfers': 1,
                'input_data_size': 256,
                'is_internal': 0,
                'timestamp': exec_result['timestamp'],
            }
            
            # Analyze with fraud detector
            if fraud_detector.is_trained:
                analysis = fraud_detector.score_transaction(tx_for_analysis)
                exec_result['security_analysis'] = analysis
                
                # If high risk, log to security alerts
                if analysis['risk_score'] >= 70:
                    try:
                        from blockchain.PACKAGE_D_security_alerts import security_alert_logger
                        alert_result = security_alert_logger.log_security_alert(
                            transaction_hash=exec_result['tx_hash'],
                            wallet_address=data.get('from_address', ''),
                            risk_score=analysis['risk_score'],
                            severity=analysis['severity'],
                            threat_type=analysis['threat_type'],
                            threat_details={'execution_type': data.get('execution_type'), 'symbol': data.get('symbol')},
                            evidence=analysis.get('evidence', []),
                            model_version="isolation_forest_v1"
                        )
                        exec_result['security_logged'] = alert_result['status'] == 'success'
                    except Exception as e:
                        log.warning(f"Could not log security alert: {e}")
        
        return jsonify({
            "success": exec_result['status'] == 'success',
            "execution": exec_result,
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        })
    
    except Exception as e:
        log.error("Trade execution logging error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/trading/get-executions", methods=["GET"])
def get_trade_executions():
    """
    Get recent trade executions for security monitoring page
    """
    try:
        from blockchain.PACKAGE_E_trade_execution_logger import trade_execution_logger
        
        limit = int(request.args.get('limit', 20))
        symbol = request.args.get('symbol', None)
        
        executions = trade_execution_logger.get_execution_for_security_analysis(limit)
        
        if symbol:
            executions = [e for e in executions if e['symbol'] == symbol]
        
        # Calculate stats
        stats = {
            'critical': sum(1 for e in executions if e['status'] == 'critical'),
            'high': sum(1 for e in executions if e['status'] == 'high'),
            'medium': sum(1 for e in executions if e['status'] == 'medium'),
            'low': sum(1 for e in executions if e['status'] == 'low'),
        }
        
        # Get bot performance
        bot_perf = trade_execution_logger.get_bot_performance()
        
        return jsonify({
            "success": True,
            "executions": executions,
            "alertStats": stats,
            "botPerformance": bot_perf if isinstance(bot_perf, dict) else bot_perf,
            "total": len(executions),
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        })
    
    except Exception as e:
        log.error("Get executions error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/trading/bot-performance", methods=["GET"])
def get_bot_performance():
    """
    Get all bot performance metrics from blockchain ledger
    """
    try:
        from blockchain.PACKAGE_E_trade_execution_logger import trade_execution_logger
        
        bot_id = request.args.get('bot_id', None)
        bot_perf = trade_execution_logger.get_bot_performance(bot_id)
        
        return jsonify({
            "success": True,
            "bot_performance": bot_perf,
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        })
    
    except Exception as e:
        log.error("Bot performance error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/trading/execution-statistics", methods=["GET"])
def get_execution_statistics():
    """
    Get execution statistics by symbol and type
    """
    try:
        from blockchain.PACKAGE_E_trade_execution_logger import trade_execution_logger
        
        symbol = request.args.get('symbol', None)
        stats = trade_execution_logger.get_execution_statistics(symbol)
        
        return jsonify({
            "success": True,
            "statistics": stats,
            "generatedAt": datetime.utcnow().isoformat() + "Z"
        })
    
    except Exception as e:
        log.error("Execution statistics error: %s\n%s", e, traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500

# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  IntelliDex ML API Server")
    print(f"  Port: {PORT}")
    print(f"  Model: {MODEL_PATH}")
    print(f"  Data:  {DATA_PATH}")
    print("=" * 60)

    # Eagerly load model at startup so first request is fast
    try:
        mgr.ensure_loaded()
    except Exception as e:
        log.warning("Could not pre-load model: %s (will retry on first request)", e)

    app.run(host="0.0.0.0", port=PORT, debug=False)
