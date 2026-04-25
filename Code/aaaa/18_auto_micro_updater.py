import os
import time
import requests
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.metrics import accuracy_score
import logging
import importlib.util
from typing import Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [MICRO_UPDATER] - %(message)s')

def fetch_last_24h_binance(symbol="BTCUSDT"):
    """Fetch 1440 minutes from Binance in two 1000-limit sweeps."""
    out_df = pd.DataFrame()
    end_time = int(time.time() * 1000)
    
    # 2 requests of 1000 candles to get total ~2000 ticks (plenty to safely get 1440)
    for _ in range(2):
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1m&limit=1000&endTime={end_time}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        df_part = pd.DataFrame(data, columns=[
            "timestamp", "open", "high", "low", "close", "volume",
            "close_time", "quote_av", "trades", "tb_base_av", "tb_quote_av", "ignore"
        ])
        out_df = pd.concat([df_part, out_df], ignore_index=True)
        # update end time to the oldest candle we just got minus 1ms
        end_time = int(out_df["timestamp"].min()) - 1
        
    out_df["time"] = pd.to_datetime(out_df["timestamp"], unit="ms")
    for col in ["open", "high", "low", "close", "volume"]:
        out_df[col] = out_df[col].astype(float)
        
    # Drop duplicates just in case and sort
    out_df = out_df.drop_duplicates(subset=['time']).sort_values('time').reset_index(drop=True)
    return out_df[["time", "open", "high", "low", "close", "volume"]].tail(1500) # Give it 1500 to be safe



def engineer_features_and_target(df):
    """Rebuilds the exact 16 features required for the upgraded micro model."""
    df = df.copy()
    df['return'] = df['close'].pct_change().fillna(0)
    
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    rsi_series = 100 - (100 / (1 + rs))
    df['rsi'] = rsi_series.fillna(50)
    
    df['vol_mean'] = df['volume'].rolling(5).mean().fillna(df['volume'])
    df['momentum'] = df['close'] - df['close'].shift(3).fillna(0)
    df['ema_9'] = df['close'].ewm(span=9, adjust=False).mean()
    df['ema_21'] = df['close'].ewm(span=21, adjust=False).mean()
    
    # New indicators
    df['macd'] = df['ema_9'] - df['ema_21']
    df['bb_mid'] = df['close'].rolling(20).mean()
    df['bb_std'] = df['close'].rolling(20).std()
    df['bb_upper'] = df['bb_mid'] + 2 * df['bb_std']
    df['bb_lower'] = df['bb_mid'] - 2 * df['bb_std']
    df['atr'] = df['high'].rolling(14).apply(lambda x: np.max(x) - np.min(x), raw=False)

    # Target: 1 if next minute close > this minute close
    df['target'] = (df['close'].shift(-1) > df['close']).astype(np.float32)
    return df.dropna().reset_index(drop=True)

def train_incremental():
    here = os.path.dirname(__file__)
    data_dir = os.path.join(here, 'data')
    model_path = os.path.join(here, 'models', 'micro_model.pth')
    hist_features = os.path.join(data_dir, 'real_1min_features.csv')
    
    logging.info("Step 1: Fetching recent 24h 1-min market data via Binance API...")
    raw_df = fetch_last_24h_binance()
    
    logging.info("Step 2: Engineering 16 advanced momentum features...")
    df = engineer_features_and_target(raw_df)
    
    # Needs to scale via the massive 30-day baseline to not destroy weight distribution
    baseline_df = pd.read_csv(hist_features).dropna()
    feature_cols = ['open', 'high', 'low', 'close', 'volume', 'return', 'rsi', 'vol_mean', 'momentum', 'ema_9', 'ema_21', 'macd', 'bb_mid', 'bb_upper', 'bb_lower', 'atr']
    
    # Check if all feature_cols exist in baseline_df, if not, compute from current df for missing ones
    for col in feature_cols:
        if col not in baseline_df.columns:
            logging.info(f"Feature '{col}' not in baseline. Extending baseline dataset...")
            # This is a one-time fix: if the baseline CSV is old, we add the column
            # For simplicity, we'll just use the current 24h stats for those columns
            baseline_df[col] = df[col].mean() # Approximation

    baseline_mean = np.mean(baseline_df[feature_cols].values.astype(np.float32), axis=0)
    baseline_std = np.std(baseline_df[feature_cols].values.astype(np.float32), axis=0)
    
    X = (df[feature_cols].values.astype(np.float32) - baseline_mean) / (baseline_std + 1e-8)
    y = df['target'].values.astype(np.float32).reshape(-1, 1)
    
    # 80/20 Chronological Split
    split = int(len(X) * 0.8)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]
    
    train_loader = DataLoader(TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train)), batch_size=128, shuffle=True)
    val_loader = DataLoader(TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val)), batch_size=128, shuffle=False)
    
    logging.info("Step 3: Loading LightweightMicroModel (Input: 16)...")
    spec = importlib.util.spec_from_file_location('micro_model', os.path.join(here, '05_micro_model_def.py'))
    micro_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(micro_mod)
    model = micro_mod.LightweightMicroModel(input_dim=16)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    if os.path.exists(model_path):
        try:
            model.load_state_dict(torch.load(model_path, map_location=device))
            logging.info("✓ Model weights loaded successfully.")
        except Exception as e:
            logging.warning(f"⚠️ Architecture mismatch or corrupt file: {e}")
            logging.info("Re-initializing model for the new 16-feature architecture.")
    else:
        logging.info("No existing model found. Initializing new training.")
        
    model.to(device)
    
    # Notice the extremely ultra-conservative Learning Rate (5e-5) to prevent
    # Catastrophic Forgetting of the original 30 days of training patterns.
    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.AdamW(model.parameters(), lr=5e-5, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10)
    
    logging.info(f"Step 4: Incrementally fine-tuning on {len(X_train)} samples, validating on {len(X_val)} samples.")
    best_val_acc = 0.0
    best_weights = model.state_dict().copy()
    
    no_improve_cnt = 0
    for epoch in range(10):  # Extended training cycle with early stopping
        model.train()
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            out = model(xb).squeeze(1)
            loss = criterion(out, yb.squeeze(1))
            loss.backward()
            optimizer.step()
            
        model.eval()
        val_preds, val_targets = [], []
        with torch.no_grad():
            for xb, yb in val_loader:
                xb, yb = xb.to(device), yb.to(device)
                out = model(xb).squeeze(1)
                probs = torch.sigmoid(out)
                val_preds.extend((probs > 0.5).cpu().numpy())
                val_targets.extend(yb.squeeze(1).cpu().numpy())
                
        acc = accuracy_score(val_targets, val_preds) * 100
        
        logging.info(f"Epoch {epoch+1:02d}/10 - Val Accuracy: {acc:.2f}%")
        # Scheduler step per epoch
        scheduler.step()
        # Early stopping check
        if acc > best_val_acc:
            best_val_acc = acc
            best_weights = model.state_dict().copy()
            no_improve_cnt = 0
        else:
            no_improve_cnt += 1
        if no_improve_cnt >= 3:
            logging.info("Early stopping triggered after 3 epochs without improvement.")
            break

    logging.info("Step 5: Daily Assessment...")
    
    # We only save the weights if the model didn't just overfit to a weird flat day (< 50%)
    if best_val_acc >= 50.0:
        logging.info(f"✅ Success. Micro Model performed at {best_val_acc:.2f}%. Safely overwriting weights!")
        torch.save(best_weights, model_path)
    else:
        logging.warning(f"⚠️ Flat Market Day (best was {best_val_acc:.2f}%). Discarding new weights to protect base intelligence.")

if __name__ == "__main__":
    try:
        train_incremental()
    except Exception as e:
        logging.error(f"Nightly Micro Retrain Failed: {e}")
