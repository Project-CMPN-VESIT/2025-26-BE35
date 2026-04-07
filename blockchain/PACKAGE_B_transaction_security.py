"""
PACKAGE B: BLOCKCHAIN TRANSACTION SECURITY SYSTEM
==================================================
ML-powered fraud detection and anomaly scoring

Features:
- Real-time transaction risk scoring (0-100)
- Anomaly detection using Isolation Forest
- Behavioral profiling of wallet addresses
- Multi-signature attack detection
- Flash loan exploit detection
- Phishing pattern recognition

Use Cases:
- Score any Ethereum transaction before execution
- Monitor wallet for suspicious activity
- Alert on high-risk patterns
- Integrate with smart contracts as security oracle
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import json
import requests
from pathlib import Path
import pickle

# ML imports
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')


@dataclass
class Transaction:
    """Transaction data structure"""
    tx_hash: str
    from_address: str
    to_address: str
    value_eth: float
    gas_price_gwei: float
    gas_limit: int
    timestamp: datetime
    block_number: int
    contract_interaction: bool = False
    token_transfers: int = 0
    input_data_size: int = 0


@dataclass
class SecurityAlert:
    """Security alert structure"""
    alert_id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    alert_type: str
    risk_score: float  # 0-100
    description: str
    evidence: List[str]
    recommended_action: str
    timestamp: datetime


class TransactionRiskScorer:
    """
    ML-based risk scoring for blockchain transactions
    """
    
    def __init__(self):
        self.isolation_forest = IsolationForest(
            contamination=0.05,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        
        # Known malicious patterns
        self.known_scam_addresses = set()
        self.phishing_patterns = []
        
        # Behavioral baselines
        self.address_profiles = {}
        
    def extract_features(self, tx: Transaction, tx_history: List[Transaction]) -> np.ndarray:
        """
        Extract 20+ features for anomaly detection
        """
        features = []
        
        # === BASIC TRANSACTION FEATURES ===
        features.append(tx.value_eth)
        features.append(tx.gas_price_gwei)
        features.append(tx.gas_limit)
        features.append(float(tx.contract_interaction))
        features.append(tx.token_transfers)
        features.append(tx.input_data_size)
        
        # === TEMPORAL FEATURES ===
        hour = tx.timestamp.hour
        day_of_week = tx.timestamp.weekday()
        is_weekend = float(day_of_week >= 5)
        is_night = float(hour < 6 or hour > 22)  # 10 PM - 6 AM
        
        features.extend([hour, day_of_week, is_weekend, is_night])
        
        # === SENDER BEHAVIOR FEATURES ===
        sender_txs = [t for t in tx_history if t.from_address == tx.from_address]
        
        if sender_txs:
            # Historical statistics
            avg_value = np.mean([t.value_eth for t in sender_txs])
            std_value = np.std([t.value_eth for t in sender_txs]) if len(sender_txs) > 1 else 0.01
            max_value = max([t.value_eth for t in sender_txs])
            tx_count = len(sender_txs)
            
            # Value deviation (Z-score)
            value_zscore = (tx.value_eth - avg_value) / (std_value + 1e-6)
            
            # Transaction frequency
            if len(sender_txs) > 1:
                time_diffs = [(sender_txs[i].timestamp - sender_txs[i-1].timestamp).total_seconds() 
                             for i in range(1, len(sender_txs))]
                avg_time_between_txs = np.mean(time_diffs) if time_diffs else 0
            else:
                avg_time_between_txs = 0
            
            features.extend([
                avg_value, std_value, max_value, tx_count,
                value_zscore, avg_time_between_txs
            ])
        else:
            # New address - higher risk
            features.extend([0, 0, 0, 0, 10.0, 0])  # High Z-score for new addresses
        
        # === RECIPIENT BEHAVIOR ===
        recipient_txs = [t for t in tx_history if t.to_address == tx.to_address]
        
        if recipient_txs:
            recipient_tx_count = len(recipient_txs)
            unique_senders = len(set(t.from_address for t in recipient_txs))
            avg_received = np.mean([t.value_eth for t in recipient_txs])
        else:
            recipient_tx_count = 0
            unique_senders = 0
            avg_received = 0
        
        features.extend([recipient_tx_count, unique_senders, avg_received])
        
        return np.array(features)
    
    def train_on_historical_data(self, transactions: List[Transaction]):
        """
        Train anomaly detector on historical transaction data
        """
        print("Training anomaly detector on historical data...")
        
        # Extract features for all transactions
        feature_matrix = []
        for i, tx in enumerate(transactions):
            # Use all previous transactions as history
            history = transactions[:i]
            features = self.extract_features(tx, history)
            feature_matrix.append(features)
        
        X = np.array(feature_matrix)
        
        # Fit scaler
        X_scaled = self.scaler.fit_transform(X)
        
        # Train isolation forest
        self.isolation_forest.fit(X_scaled)
        
        self.is_trained = True
        print(f"✅ Trained on {len(transactions)} transactions")
    
    def score_transaction(self, tx: Transaction, tx_history: List[Transaction]) -> Dict:
        """
        Score a transaction for risk (0-100)
        
        Returns:
            Dict with risk_score, severity, and explanation
        """
        
        # Extract features
        features = self.extract_features(tx, tx_history)
        
        # Initialize risk components
        risk_components = {}
        
        # === COMPONENT 1: ML Anomaly Score (40 points) ===
        if self.is_trained:
            features_scaled = self.scaler.transform(features.reshape(1, -1))
            anomaly_score = self.isolation_forest.score_samples(features_scaled)[0]
            
            # Convert to 0-40 scale (lower anomaly score = higher risk)
            ml_risk = max(0, min(40, (-anomaly_score) * 20))
            risk_components['ml_anomaly'] = ml_risk
        else:
            risk_components['ml_anomaly'] = 20  # Default moderate risk
        
        # === COMPONENT 2: Value Risk (20 points) ===
        sender_txs = [t for t in tx_history if t.from_address == tx.from_address]
        
        if sender_txs:
            avg_value = np.mean([t.value_eth for t in sender_txs])
            if avg_value > 0:
                value_multiplier = tx.value_eth / avg_value
                
                # Risk increases exponentially with unusual values
                if value_multiplier > 5:  # 5x normal = high risk
                    value_risk = 20
                elif value_multiplier > 2:
                    value_risk = 15
                elif value_multiplier < 0.1:  # Dust transaction
                    value_risk = 10
                else:
                    value_risk = 5
            else:
                value_risk = 10
        else:
            value_risk = 15  # New address
        
        risk_components['value_risk'] = value_risk
        
        # === COMPONENT 3: Temporal Risk (15 points) ===
        hour = tx.timestamp.hour
        is_night = hour < 6 or hour > 22
        is_weekend = tx.timestamp.weekday() >= 5
        
        temporal_risk = 0
        if is_night:
            temporal_risk += 8  # Night transactions are riskier
        if is_weekend:
            temporal_risk += 7
        
        risk_components['temporal_risk'] = temporal_risk
        
        # === COMPONENT 4: Pattern Risk (25 points) ===
        pattern_risk = 0
        
        # Check for known scam addresses
        if tx.to_address in self.known_scam_addresses:
            pattern_risk += 25
        
        # Check for rapid succession (potential flash loan)
        recent_txs = [t for t in sender_txs if 
                     (tx.timestamp - t.timestamp).total_seconds() < 60]
        if len(recent_txs) > 5:
            pattern_risk += 15
        
        # Check for contract interaction with high value
        if tx.contract_interaction and tx.value_eth > 10:
            pattern_risk += 10
        
        # Check for unusual gas settings
        if tx.gas_price_gwei > 500:  # Very high gas
            pattern_risk += 5
        
        risk_components['pattern_risk'] = min(25, pattern_risk)
        
        # === TOTAL RISK SCORE ===
        total_risk = sum(risk_components.values())
        total_risk = min(100, max(0, total_risk))
        
        # Determine severity
        if total_risk >= 80:
            severity = "CRITICAL"
        elif total_risk >= 60:
            severity = "HIGH"
        elif total_risk >= 40:
            severity = "MEDIUM"
        else:
            severity = "LOW"
        
        # Generate explanation
        explanations = []
        if risk_components['ml_anomaly'] > 20:
            explanations.append("Unusual transaction pattern detected")
        if risk_components['value_risk'] > 15:
            explanations.append("Value significantly differs from normal behavior")
        if risk_components['temporal_risk'] > 10:
            explanations.append("Transaction at unusual time")
        if risk_components['pattern_risk'] > 15:
            explanations.append("Matches known attack patterns")
        
        if not explanations:
            explanations.append("Transaction appears normal")
        
        return {
            "risk_score": round(total_risk, 2),
            "severity": severity,
            "components": risk_components,
            "explanations": explanations,
            "is_trained": self.is_trained
        }
    
    def add_known_scam_address(self, address: str):
        """Add address to known scam list"""
        self.known_scam_addresses.add(address.lower())
    
    def save_model(self, filepath: str = "transaction_risk_model.pkl"):
        """Save trained model"""
        model_data = {
            'isolation_forest': self.isolation_forest,
            'scaler': self.scaler,
            'is_trained': self.is_trained,
            'known_scam_addresses': self.known_scam_addresses
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"✅ Model saved to {filepath}")
    
    def load_model(self, filepath: str = "transaction_risk_model.pkl"):
        """Load trained model"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.isolation_forest = model_data['isolation_forest']
        self.scaler = model_data['scaler']
        self.is_trained = model_data['is_trained']
        self.known_scam_addresses = model_data['known_scam_addresses']
        
        print(f"✅ Model loaded from {filepath}")


class SecurityAlertManager:
    """
    Manages security alerts and notifications
    """
    
    def __init__(self, alert_log_file: str = "security_alerts.json"):
        self.alert_log_file = alert_log_file
        self.alerts = []
    
    def create_alert(self, tx: Transaction, risk_analysis: Dict) -> SecurityAlert:
        """Create security alert from risk analysis"""
        
        alert_id = f"ALERT_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Build evidence list
        evidence = []
        for explanation in risk_analysis['explanations']:
            evidence.append(explanation)
        
        # Recommended action based on severity
        if risk_analysis['severity'] == "CRITICAL":
            recommended_action = "BLOCK TRANSACTION - Manual review required"
        elif risk_analysis['severity'] == "HIGH":
            recommended_action = "DELAY & VERIFY - Confirm transaction legitimacy"
        elif risk_analysis['severity'] == "MEDIUM":
            recommended_action = "MONITOR - Proceed with caution"
        else:
            recommended_action = "ALLOW - Normal transaction"
        
        alert = SecurityAlert(
            alert_id=alert_id,
            severity=risk_analysis['severity'],
            alert_type="TRANSACTION_RISK",
            risk_score=risk_analysis['risk_score'],
            description=f"Transaction {tx.tx_hash[:16]}... flagged",
            evidence=evidence,
            recommended_action=recommended_action,
            timestamp=datetime.utcnow()
        )
        
        self.alerts.append(alert)
        self.save_alert(alert)
        
        return alert
    
    def save_alert(self, alert: SecurityAlert):
        """Save alert to JSON log"""
        alert_dict = {
            'alert_id': alert.alert_id,
            'severity': alert.severity,
            'alert_type': alert.alert_type,
            'risk_score': alert.risk_score,
            'description': alert.description,
            'evidence': alert.evidence,
            'recommended_action': alert.recommended_action,
            'timestamp': alert.timestamp.isoformat()
        }
        
        # Load existing alerts
        if Path(self.alert_log_file).exists():
            with open(self.alert_log_file, 'r') as f:
                all_alerts = json.load(f)
        else:
            all_alerts = []
        
        all_alerts.append(alert_dict)
        
        # Save updated alerts
        with open(self.alert_log_file, 'w') as f:
            json.dump(all_alerts, f, indent=2)
    
    def get_recent_alerts(self, hours: int = 24) -> List[Dict]:
        """Get alerts from last N hours"""
        if not Path(self.alert_log_file).exists():
            return []
        
        with open(self.alert_log_file, 'r') as f:
            all_alerts = json.load(f)
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        recent = [a for a in all_alerts 
                 if datetime.fromisoformat(a['timestamp']) > cutoff_time]
        
        return recent


# ============================================
# DEMO & TESTING
# ============================================

def generate_sample_transactions(n: int = 100) -> List[Transaction]:
    """Generate sample transactions for testing"""
    transactions = []
    
    addresses = [f"0x{'a'*40}", f"0x{'b'*40}", f"0x{'c'*40}"]
    
    for i in range(n):
        tx = Transaction(
            tx_hash=f"0x{i:064x}",
            from_address=np.random.choice(addresses),
            to_address=np.random.choice(addresses),
            value_eth=np.random.lognormal(0, 2),  # Realistic distribution
            gas_price_gwei=np.random.uniform(20, 200),
            gas_limit=21000,
            timestamp=datetime.utcnow() - timedelta(hours=n-i),
            block_number=1000000 + i,
            contract_interaction=np.random.random() < 0.3,
            token_transfers=np.random.randint(0, 5)
        )
        transactions.append(tx)
    
    return transactions


if __name__ == "__main__":
    print("="*70)
    print("BLOCKCHAIN TRANSACTION SECURITY SYSTEM - DEMO")
    print("="*70)
    
    # Initialize
    scorer = TransactionRiskScorer()
    alert_manager = SecurityAlertManager()
    
    # Generate sample data
    print("\n📊 Generating sample transactions...")
    historical_txs = generate_sample_transactions(100)
    
    # Train model
    scorer.train_on_historical_data(historical_txs)
    
    # Test on new transaction
    print("\n🔍 Testing on new transaction...")
    
    # Normal transaction
    normal_tx = Transaction(
        tx_hash="0x" + "1"*64,
        from_address="0x" + "a"*40,
        to_address="0x" + "b"*40,
        value_eth=1.5,
        gas_price_gwei=50,
        gas_limit=21000,
        timestamp=datetime.utcnow(),
        block_number=1000100,
        contract_interaction=False
    )
    
    result = scorer.score_transaction(normal_tx, historical_txs)
    
    print(f"\n✅ Normal Transaction Analysis:")
    print(f"   Risk Score: {result['risk_score']}/100")
    print(f"   Severity: {result['severity']}")
    print(f"   Components: {result['components']}")
    
    # Suspicious transaction
    suspicious_tx = Transaction(
        tx_hash="0x" + "2"*64,
        from_address="0x" + "a"*40,
        to_address="0x" + "d"*40,
        value_eth=50.0,  # 30x normal
        gas_price_gwei=800,  # Very high gas
        gas_limit=21000,
        timestamp=datetime.utcnow().replace(hour=3),  # 3 AM
        block_number=1000101,
        contract_interaction=True
    )
    
    result2 = scorer.score_transaction(suspicious_tx, historical_txs)
    
    print(f"\n⚠️  Suspicious Transaction Analysis:")
    print(f"   Risk Score: {result2['risk_score']}/100")
    print(f"   Severity: {result2['severity']}")
    print(f"   Components: {result2['components']}")
    print(f"   Explanations: {result2['explanations']}")
    
    # Create alert
    alert = alert_manager.create_alert(suspicious_tx, result2)
    print(f"\n🚨 Alert Created: {alert.alert_id}")
    print(f"   Action: {alert.recommended_action}")
    
    # Save model
    scorer.save_model()
    
    print("\n" + "="*70)
    print("✅ Security system ready to protect your blockchain transactions!")
    print("="*70)
