"""
ML FRAUD DETECTION SERVICE
===========================
Isolation Forest-based anomaly detection for blockchain transactions
Detects:
- Flash loan attacks
- Phishing wallets
- Scam addresses
- Pump & dump patterns
- Unusual transaction patterns
- High-velocity transfers
"""

import os
import pickle
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple
from datetime import datetime
import json


class MLFraudDetector:
    """
    Uses Isolation Forest to detect anomalous blockchain transactions
    Provides risk scoring and threat pattern identification
    """
    
    def __init__(self):
        self.isolation_forest = IsolationForest(
            contamination=0.05,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        
        # Known bad actors and patterns
        self.known_phishing_patterns = [
            "honeypot", "rug_pull", "exit_scam",
            "front_run", "sandwich_attack"
        ]
        
        # Threat level thresholds
        self.CRITICAL_THRESHOLD = 85
        self.HIGH_THRESHOLD = 70
        self.MEDIUM_THRESHOLD = 50
        self.LOW_THRESHOLD = 30
    
    def extract_features(self, 
                        transaction: Dict,
                        wallet_history: List[Dict] = None,
                        blockchain_context: Dict = None) -> np.ndarray:
        """
        Extract 20+ features for Isolation Forest anomaly detection
        
        Features include:
        - Transaction value (ETH)
        - Gas price and limit
        - Contract interactions
        - Temporal patterns
        - Sender/recipient behavior
        - Velocity metrics
        """
        
        features = []
        wallet_history = wallet_history or []
        blockchain_context = blockchain_context or {}
        
        # === TRANSACTION-LEVEL FEATURES (7 features) ===
        features.append(float(transaction.get('value_eth', 0)))              # Transaction value
        features.append(float(transaction.get('gas_price_gwei', 20)))        # Gas price
        features.append(int(transaction.get('gas_limit', 21000)))            # Gas limit
        features.append(float(transaction.get('is_contract', 0)))            # Contract interaction
        features.append(float(transaction.get('token_transfers', 0)))        # Token transfers
        features.append(float(transaction.get('input_data_size', 0)))        # Input data size
        features.append(float(transaction.get('is_internal', 0)))            # Internal tx
        
        # === TEMPORAL FEATURES (4 features) ===
        if 'timestamp' in transaction:
            dt = datetime.fromisoformat(transaction['timestamp'])
            features.append(float(dt.hour))                                  # Hour of day
            features.append(float(dt.weekday()))                             # Day of week
            features.append(float(dt.weekday() >= 5))                        # Is weekend
            features.append(float(dt.hour < 6 or dt.hour > 22))             # Is night time
        else:
            features.extend([0, 0, 0, 0])
        
        # === SENDER BEHAVIOR (5 features) ===
        from_addr = transaction.get('from_address', '')
        sender_txs = [t for t in wallet_history if t.get('from_address') == from_addr]
        
        if sender_txs:
            values = [float(t.get('value_eth', 0)) for t in sender_txs]
            avg_val = np.mean(values)
            std_val = np.std(values) if len(values) > 1 else 0.01
            
            current_value = float(transaction.get('value_eth', 0))
            value_zscore = (current_value - avg_val) / (std_val + 1e-6)
            
            # Transaction frequency
            if len(sender_txs) > 1:
                time_diffs = []
                for i in range(1, len(sender_txs)):
                    t1 = datetime.fromisoformat(sender_txs[i]['timestamp'])
                    t0 = datetime.fromisoformat(sender_txs[i-1]['timestamp'])
                    time_diffs.append((t1 - t0).total_seconds())
                avg_time_between = np.mean(time_diffs) if time_diffs else 3600
            else:
                avg_time_between = 3600
            
            features.extend([
                avg_val,                                                     # Avg historical value
                std_val,                                                     # Std value
                len(sender_txs),                                             # Tx count
                value_zscore,                                                # Value anomaly score
                3600 / (avg_time_between + 1) if avg_time_between > 0 else 1  # Velocity
            ])
        else:
            # New wallet = anomalous
            features.extend([0, 0, 0, 10.0, 0])
        
        # === RECIPIENT BEHAVIOR (3 features) ===
        to_addr = transaction.get('to_address', '')
        recipient_txs = [t for t in wallet_history if t.get('to_address') == to_addr]
        
        if recipient_txs:
            features.append(len(recipient_txs))                              # Recipient tx count
            senders = set([t.get('from_address') for t in recipient_txs])
            features.append(len(senders))                                    # Unique senders
            values = [float(t.get('value_eth', 0)) for t in recipient_txs]
            features.append(np.mean(values))                                 # Avg received
        else:
            features.extend([0, 0, 0])
        
        # === BLOCKCHAIN CONTEXT (2 features) ===
        block_num = blockchain_context.get('current_block', 0)
        features.append(float(block_num))                                    # Current block
        features.append(float(blockchain_context.get('network_gas_price', 20)))  # Network gas price
        
        return np.array(features)
    
    def score_transaction(self,
                         transaction: Dict,
                         wallet_history: List[Dict] = None,
                         blockchain_context: Dict = None) -> Dict:
        """
        Score a transaction for fraud risk
        
        Returns:
            Dict with risk_score (0-100), severity, threats, and recommendations
        """
        
        features = self.extract_features(transaction, wallet_history, blockchain_context)
        
        risk_components = {}
        total_risk = 0.0
        
        # === COMPONENT 1: ML Anomaly Score (40 points max) ===
        if self.is_trained:
            features_scaled = self.scaler.transform(features.reshape(1, -1))
            anomaly_score = self.isolation_forest.score_samples(features_scaled)[0]
            
            # Convert to 0-40 risk scale
            ml_risk = max(0, min(40, (-anomaly_score) * 20))
            risk_components['isolation_forest'] = ml_risk
            total_risk += ml_risk
        
        # === COMPONENT 2: Value Deviation (20 points max) ===
        if wallet_history:
            from_addr = transaction.get('from_address', '')
            sender_txs = [t for t in wallet_history if t.get('from_address') == from_addr]
            
            if sender_txs:
                values = [float(t.get('value_eth', 0)) for t in sender_txs]
                avg_val = np.mean(values)
                std_val = np.std(values) if len(values) > 1 else 0.01
                
                current_value = float(transaction.get('value_eth', 0))
                value_zscore = abs((current_value - avg_val) / (std_val + 1e-6))
                
                # High deviation = high risk
                value_risk = min(20, value_zscore * 3)
                risk_components['value_deviation'] = value_risk
                total_risk += value_risk
        
        # === COMPONENT 3: Known Bad Patterns (20 points max) ===
        pattern_risk = self._detect_known_patterns(transaction)
        if pattern_risk > 0:
            risk_components['known_patterns'] = pattern_risk
            total_risk += pattern_risk
        
        # === COMPONENT 4: High Velocity (15 points max) ===
        if wallet_history:
            from_addr = transaction.get('from_address', '')
            sender_txs = [t for t in wallet_history if t.get('from_address') == from_addr]
            
            if len(sender_txs) >= 10:
                # Many transactions recently = potentially suspicious
                recent_txs = [t for t in sender_txs if (
                    datetime.fromisoformat(t['timestamp']).timestamp() >
                    datetime.now().timestamp() - 3600
                )]
                
                if len(recent_txs) > 5:
                    velocity_risk = min(15, len(recent_txs) * 2)
                    risk_components['high_velocity'] = velocity_risk
                    total_risk += velocity_risk
        
        # === COMPONENT 5: Contract Interaction Risk (5 points max) ===
        if transaction.get('is_contract') and not transaction.get('verified_contract'):
            risk_components['unverified_contract'] = 5
            total_risk += 5
        
        # Clamp to 0-100
        risk_score = min(100, max(0, total_risk))
        
        # Determine severity
        if risk_score >= self.CRITICAL_THRESHOLD:
            severity = "CRITICAL"
            threat_type = "SUSPECTED_FRAUD"
        elif risk_score >= self.HIGH_THRESHOLD:
            severity = "HIGH"
            threat_type = "HIGH_RISK_TRANSACTION"
        elif risk_score >= self.MEDIUM_THRESHOLD:
            severity = "MEDIUM"
            threat_type = "MEDIUM_RISK_TRANSACTION"
        else:
            severity = "LOW"
            threat_type = "LOW_RISK_TRANSACTION"
        
        # Generate evidence and recommendations
        evidence = self._generate_evidence(transaction, risk_components)
        recommendations = self._generate_recommendations(risk_score, threat_type)
        
        return {
            "risk_score": int(risk_score),
            "severity": severity,
            "threat_type": threat_type,
            "risk_components": risk_components,
            "evidence": evidence,
            "recommendations": recommendations,
            "transaction_address": transaction.get('from_address'),
            "target_wallet": transaction.get('to_address'),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _detect_known_patterns(self, transaction: Dict) -> float:
        """
        Detect known fraud patterns
        Check for flash loan signatures, phishing patterns, etc.
        """
        risk = 0.0
        
        # Check input data for suspicious patterns
        input_data = transaction.get('input_data', '').lower()
        
        # Flash loan indicators
        if 'flashloan' in input_data or 'initiateflashloan' in input_data:
            risk += 8
        
        # High-risk operations
        if 'selfdestruct' in input_data or 'delegatecall' in input_data:
            risk += 5
        
        # Check address patterns
        to_addr = transaction.get('to_address', '').lower()
        
        # Common phishing addresses (in real system, would check against database)
        if len(to_addr) >= 40:
            # Check if address has suspicious patterns
            if to_addr in ['0x0000000000000000000000000000000000000001']:
                risk += 10
        
        return min(20, risk)
    
    def _generate_evidence(self, transaction: Dict, risk_components: Dict) -> List[str]:
        """Generate evidence list for the alert"""
        evidence = []
        
        for component, score in risk_components.items():
            if score > 0:
                if component == 'isolation_forest':
                    evidence.append(f"ML anomaly detected with score {score:.1f}/40")
                elif component == 'value_deviation':
                    evidence.append(f"Transaction value significantly deviates from historical pattern ({score:.1f}/20)")
                elif component == 'known_patterns':
                    evidence.append(f"Known fraud patterns detected ({score:.1f}/20)")
                elif component == 'high_velocity':
                    evidence.append(f"High transaction frequency detected ({score:.1f}/15)")
                elif component == 'unverified_contract':
                    evidence.append("Interaction with unverified smart contract")
        
        return evidence
    
    def _generate_recommendations(self, risk_score: int, threat_type: str) -> List[str]:
        """Generate recommended actions"""
        recommendations = []
        
        if risk_score >= self.CRITICAL_THRESHOLD:
            recommendations.append("⚠️ CRITICAL: Block transaction immediately")
            recommendations.append("Flag wallet address for manual investigation")
            recommendations.append("Report to security team")
            recommendations.append("Consider adding to blacklist")
        elif risk_score >= self.HIGH_THRESHOLD:
            recommendations.append("❌ HIGH RISK: Require additional verification")
            recommendations.append("Monitor wallet for further suspicious activity")
            recommendations.append("Review transaction details carefully")
        elif risk_score >= self.MEDIUM_THRESHOLD:
            recommendations.append("⚠️ MEDIUM RISK: Proceed with caution")
            recommendations.append("Request additional user confirmation")
        else:
            recommendations.append("✓ LOW RISK: Safe to proceed")
        
        return recommendations
    
    def load_model(self, filepath='trained_fraud_detector.pkl'):
        """
        Load a previously trained model from disk.
        Called during API server startup.
        """
        if not os.path.exists(filepath):
            print(f"ℹ️ No trained model found at {filepath}")
            return False
        
        try:
            print(f"📂 Loading trained fraud detector from {filepath}...")
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            self.isolation_forest = model_data['isolation_forest']
            self.scaler = model_data['scaler']
            self.is_trained = model_data['is_trained']
            
            metadata = model_data.get('model_info', {})
            trained_at = model_data.get('trained_at', 'unknown')
            data_source = model_data.get('transactions_used', 'unknown')
            
            print(f"✅ Model loaded successfully!")
            print(f"   Source: {data_source}")
            print(f"   Trained: {trained_at}")
            print(f"   Parameters: contamination={metadata.get('contamination', 0.05)}, "
                  f"n_estimators={metadata.get('n_estimators', 100)}, "
                  f"features={metadata.get('features', 21)}")
            return True
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False
    
    def train(self, historical_transactions: List[Dict]):
        """Train Isolation Forest on historical transaction data"""
        print(f"Training fraud detector on {len(historical_transactions)} transactions...")
        
        feature_matrix = []
        for i, tx in enumerate(historical_transactions):
            history = historical_transactions[:i]
            features = self.extract_features(tx, history)
            feature_matrix.append(features)
        
        X = np.array(feature_matrix)
        X_scaled = self.scaler.fit_transform(X)
        
        self.isolation_forest.fit(X_scaled)
        self.is_trained = True
        
        print(f"✅ Fraud detector trained and ready")


# Initialize global detector
fraud_detector = MLFraudDetector()

# Try to load the trained model on startup
fraud_detector.load_model('trained_fraud_detector.pkl')
if not fraud_detector.is_trained:
    print("⚠️ Using untrained fraud detector (train_fraud_detector.py first)")
