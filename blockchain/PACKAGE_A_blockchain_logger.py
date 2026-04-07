"""
PACKAGE A: PREDICTION BLOCKCHAIN BRIDGE
========================================
Wraps your prediction system with blockchain-ready logging

Features:
- Cryptographic hashing of predictions (SHA-256)
- Timestamp verification
- IPFS storage preparation
- Local verification database
- Zero impact on existing prediction system

Integration: Import and call log_prediction() after making predictions
"""

import json
import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import pandas as pd

class PredictionBlockchainLogger:
    """
    Logs predictions with cryptographic proof for later blockchain verification
    """
    
    def __init__(self, db_path: str = "prediction_verification.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database for local verification"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediction_hash TEXT UNIQUE NOT NULL,
                timestamp TEXT NOT NULL,
                current_price REAL NOT NULL,
                horizons TEXT NOT NULL,
                predicted_values TEXT NOT NULL,
                confidence_scores TEXT NOT NULL,
                sentiment_score REAL,
                model_version TEXT,
                data_hash TEXT,
                ipfs_cid TEXT,
                blockchain_tx TEXT,
                created_at TEXT NOT NULL,
                verified BOOLEAN DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS verification_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediction_id INTEGER NOT NULL,
                horizon TEXT NOT NULL,
                predicted_price REAL NOT NULL,
                actual_price REAL,
                error_percentage REAL,
                direction_correct BOOLEAN,
                verified_at TEXT,
                FOREIGN KEY (prediction_id) REFERENCES predictions(id)
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def create_prediction_hash(self, prediction_data: Dict) -> str:
        """
        Create cryptographic hash of prediction data
        This hash proves the prediction was made at this time with these values
        """
        # Canonical JSON representation (sorted keys for consistency)
        canonical_json = json.dumps(prediction_data, sort_keys=True)
        
        # SHA-256 hash
        hash_object = hashlib.sha256(canonical_json.encode())
        return hash_object.hexdigest()
    
    def log_prediction(self, 
                      current_price: float,
                      predictions: Dict[str, float],
                      confidence_scores: Dict[str, float],
                      sentiment_score: Optional[float] = None,
                      model_version: str = "unified_v1") -> Dict:
        """
        Log a prediction with cryptographic proof
        
        Args:
            current_price: Current BTC price
            predictions: Dict like {"15min": 52450.0, "1hr": 52680.0, ...}
            confidence_scores: Dict like {"15min": 0.87, "1hr": 0.81, ...}
            sentiment_score: Current sentiment score
            model_version: Model identifier
            
        Returns:
            Dict with prediction_hash, timestamp, and confirmation
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare prediction data
        prediction_data = {
            "timestamp": timestamp,
            "current_price": current_price,
            "predictions": predictions,
            "confidence_scores": confidence_scores,
            "sentiment_score": sentiment_score,
            "model_version": model_version
        }
        
        # Create cryptographic hash
        pred_hash = self.create_prediction_hash(prediction_data)
        
        # Create data hash (for IPFS integrity)
        data_hash = hashlib.sha256(json.dumps(prediction_data).encode()).hexdigest()
        
        # Store in local database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO predictions (
                    prediction_hash, timestamp, current_price, horizons,
                    predicted_values, confidence_scores, sentiment_score,
                    model_version, data_hash, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                pred_hash,
                timestamp,
                current_price,
                json.dumps(list(predictions.keys())),
                json.dumps(list(predictions.values())),
                json.dumps(list(confidence_scores.values())),
                sentiment_score,
                model_version,
                data_hash,
                datetime.utcnow().isoformat()
            ))
            
            conn.commit()
            prediction_id = cursor.lastrowid
            
        except sqlite3.IntegrityError:
            conn.close()
            return {
                "status": "duplicate",
                "message": "This exact prediction already exists"
            }
        
        conn.close()
        
        # Save full prediction data to JSON file (for IPFS upload)
        predictions_dir = Path("predictions_for_ipfs")
        predictions_dir.mkdir(exist_ok=True)
        
        json_path = predictions_dir / f"prediction_{pred_hash[:16]}.json"
        with open(json_path, 'w') as f:
            json.dump(prediction_data, f, indent=2)
        
        return {
            "status": "success",
            "prediction_id": prediction_id,
            "prediction_hash": pred_hash,
            "timestamp": timestamp,
            "json_file": str(json_path),
            "message": "Prediction logged with cryptographic proof"
        }
    
    def verify_prediction(self, prediction_id: int, actual_prices: Dict[str, float]) -> Dict:
        """
        Verify a past prediction against actual prices
        
        Args:
            prediction_id: Database ID of prediction
            actual_prices: Dict like {"15min": 52445.0, "1hr": 52690.0, ...}
            
        Returns:
            Verification results with accuracy metrics
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get prediction
        cursor.execute('''
            SELECT prediction_hash, timestamp, current_price, horizons, 
                   predicted_values, confidence_scores
            FROM predictions WHERE id = ?
        ''', (prediction_id,))
        
        result = cursor.fetchone()
        if not result:
            conn.close()
            return {"status": "error", "message": "Prediction not found"}
        
        pred_hash, timestamp, current_price, horizons, predicted_values, confidence_scores = result
        
        horizons = json.loads(horizons)
        predicted_values = json.loads(predicted_values)
        confidence_scores = json.loads(confidence_scores)
        
        # Calculate verification metrics
        verification_results = []
        
        for i, horizon in enumerate(horizons):
            if horizon not in actual_prices:
                continue
                
            predicted = predicted_values[i]
            actual = actual_prices[horizon]
            
            error_pct = abs((actual - predicted) / actual) * 100
            direction_correct = (predicted > current_price) == (actual > current_price)
            
            # Store verification result
            cursor.execute('''
                INSERT INTO verification_results (
                    prediction_id, horizon, predicted_price, actual_price,
                    error_percentage, direction_correct, verified_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                prediction_id, horizon, predicted, actual,
                error_pct, direction_correct, datetime.utcnow().isoformat()
            ))
            
            verification_results.append({
                "horizon": horizon,
                "predicted": predicted,
                "actual": actual,
                "error_percentage": round(error_pct, 2),
                "direction_correct": direction_correct,
                "confidence": confidence_scores[i]
            })
        
        # Mark prediction as verified
        cursor.execute('UPDATE predictions SET verified = 1 WHERE id = ?', (prediction_id,))
        
        conn.commit()
        conn.close()
        
        return {
            "status": "verified",
            "prediction_hash": pred_hash,
            "timestamp": timestamp,
            "results": verification_results
        }
    
    def get_unverified_predictions(self) -> List[Dict]:
        """Get all predictions that haven't been verified yet"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, prediction_hash, timestamp, current_price, 
                   horizons, predicted_values, confidence_scores
            FROM predictions 
            WHERE verified = 0
            ORDER BY created_at DESC
        ''')
        
        predictions = []
        for row in cursor.fetchall():
            predictions.append({
                "id": row[0],
                "prediction_hash": row[1],
                "timestamp": row[2],
                "current_price": row[3],
                "horizons": json.loads(row[4]),
                "predicted_values": json.loads(row[5]),
                "confidence_scores": json.loads(row[6])
            })
        
        conn.close()
        return predictions
    
    def get_performance_summary(self) -> Dict:
        """Get overall performance statistics"""
        conn = sqlite3.connect(self.db_path)
        
        # Get verification stats
        df = pd.read_sql_query('''
            SELECT horizon, error_percentage, direction_correct, confidence
            FROM verification_results vr
            JOIN predictions p ON vr.prediction_id = p.id
        ''', conn)
        
        conn.close()
        
        if df.empty:
            return {"status": "no_data", "message": "No verified predictions yet"}
        
        summary = {}
        for horizon in df['horizon'].unique():
            horizon_data = df[df['horizon'] == horizon]
            
            summary[horizon] = {
                "total_predictions": len(horizon_data),
                "avg_error_percentage": round(horizon_data['error_percentage'].mean(), 2),
                "direction_accuracy": round(horizon_data['direction_correct'].mean() * 100, 2),
                "avg_confidence": round(horizon_data['confidence'].mean(), 2)
            }
        
        return {
            "status": "success",
            "summary": summary,
            "total_verified": len(df)
        }
    
    def export_for_blockchain(self, prediction_id: int) -> Dict:
        """
        Export prediction data in format ready for blockchain submission
        
        Returns:
            Dict with all data needed for smart contract interaction
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT prediction_hash, timestamp, current_price, horizons,
                   predicted_values, confidence_scores, sentiment_score,
                   model_version, data_hash
            FROM predictions WHERE id = ?
        ''', (prediction_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return {"status": "error", "message": "Prediction not found"}
        
        return {
            "status": "ready",
            "prediction_hash": result[0],
            "timestamp": result[1],
            "data": {
                "current_price": result[2],
                "horizons": json.loads(result[3]),
                "predicted_values": json.loads(result[4]),
                "confidence_scores": json.loads(result[5]),
                "sentiment_score": result[6],
                "model_version": result[7],
                "data_hash": result[8]
            }
        }


# ============================================
# INTEGRATION WRAPPER FOR YOUR EXISTING SCRIPTS
# ============================================

def integrate_with_predictor():
    """
    Example integration with your unified_predictor.py
    Add these lines after your prediction is made
    """
    
    # Initialize logger
    logger = PredictionBlockchainLogger()
    
    # After your predictor runs and you have results...
    # (This is example code - you'll adapt to your actual variables)
    
    current_price = 52347.0  # From your predictor
    
    predictions = {
        "15min": 52450.0,
        "1hr": 52680.0,
        "4hr": 53100.0,
        "12hr": 53850.0,
        "24hr": 54200.0,
        "3day": 55800.0,
        "7day": 56800.0
    }
    
    confidence_scores = {
        "15min": 0.87,
        "1hr": 0.81,
        "4hr": 0.74,
        "12hr": 0.68,
        "24hr": 0.65,
        "3day": 0.58,
        "7day": 0.52
    }
    
    sentiment_score = 0.6543
    
    # Log the prediction with cryptographic proof
    result = logger.log_prediction(
        current_price=current_price,
        predictions=predictions,
        confidence_scores=confidence_scores,
        sentiment_score=sentiment_score
    )
    
    print(f"\n✅ PREDICTION LOGGED TO BLOCKCHAIN BRIDGE")
    print(f"Hash: {result['prediction_hash'][:16]}...")
    print(f"Timestamp: {result['timestamp']}")
    print(f"JSON saved: {result['json_file']}")


if __name__ == "__main__":
    # Demo usage
    logger = PredictionBlockchainLogger()
    
    print("="*70)
    print("BLOCKCHAIN PREDICTION LOGGER - DEMO")
    print("="*70)
    
    # Log a sample prediction
    result = logger.log_prediction(
        current_price=52347.0,
        predictions={
            "15min": 52450.0,
            "1hr": 52680.0,
            "4hr": 53100.0
        },
        confidence_scores={
            "15min": 0.87,
            "1hr": 0.81,
            "4hr": 0.74
        },
        sentiment_score=0.65
    )
    
    print(f"\n✅ Prediction logged!")
    print(f"   Hash: {result['prediction_hash']}")
    print(f"   ID: {result['prediction_id']}")
    
    # Get unverified predictions
    unverified = logger.get_unverified_predictions()
    print(f"\n📊 Unverified predictions: {len(unverified)}")
    
    print("\n" + "="*70)
    print("Ready to integrate with your prediction system!")
    print("="*70)
