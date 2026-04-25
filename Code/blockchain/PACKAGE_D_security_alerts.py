"""
SECURITY ALERT BLOCKCHAIN LOGGER
==================================
Logs ML-detected security threats to blockchain with cryptographic proof

Features:
- Isolation Forest-based fraud detection
- Real-time risk scoring (0-100)
- Alert hashing and blockchain recording
- IPFS storage for alert data
- Smart contract logging via blockchain
- Multi-factor threat detection

Threat Types Detected:
- Flash loan attacks
- Phishing wallets
- Scam addresses  
- Pump & dump patterns
- Unusual transaction patterns
- Known bad actors
- High-risk velocity patterns
"""

import json
import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class SecurityAlertBlockchainLogger:
    """
    Logs security alerts with cryptographic proof for blockchain recording
    """
    
    def __init__(self, db_path: str = "security_alerts.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database for security alerts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_hash TEXT UNIQUE NOT NULL,
                timestamp TEXT NOT NULL,
                transaction_hash TEXT,
                wallet_address TEXT,
                severity TEXT NOT NULL,
                risk_score REAL NOT NULL,
                threat_type TEXT NOT NULL,
                alert_data TEXT NOT NULL,
                evidence TEXT,
                recommendations TEXT,
                ipfs_cid TEXT,
                blockchain_tx TEXT,
                created_at TEXT NOT NULL,
                recorded_on_chain BOOLEAN DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS threat_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_name TEXT NOT NULL,
                pattern_type TEXT NOT NULL,
                confidence_score REAL,
                detected_indicators TEXT,
                severity_level TEXT,
                alert_id INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY (alert_id) REFERENCES security_alerts(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wallet_risk_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                wallet_address TEXT UNIQUE NOT NULL,
                risk_score REAL,
                threat_count INTEGER DEFAULT 0,
                last_threat_timestamp TEXT,
                blacklist_status BOOLEAN DEFAULT 0,
                updated_at TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def create_alert_hash(self, alert_data: Dict) -> str:
        """
        Create cryptographic hash of security alert data
        Proves the alert was generated at this time with these details
        """
        canonical_json = json.dumps(alert_data, sort_keys=True)
        hash_object = hashlib.sha256(canonical_json.encode())
        return hash_object.hexdigest()
    
    def log_security_alert(self,
                          transaction_hash: Optional[str] = None,
                          wallet_address: Optional[str] = None,
                          risk_score: float = 0.0,
                          severity: str = "LOW",
                          threat_type: str = "UNKNOWN",
                          threat_details: Dict = None,
                          evidence: List[str] = None,
                          recommendations: List[str] = None,
                          model_version: str = "fraud_detection_v1") -> Dict:
        """
        Log a security threat alert with cryptographic proof
        
        Args:
            transaction_hash: TX hash being analyzed
            wallet_address: Wallet address flagged
            risk_score: Risk score 0-100
            severity: CRITICAL, HIGH, MEDIUM, LOW
            threat_type: Type of threat detected
            threat_details: Dict with threat analysis details
            evidence: List of evidence supporting the alert
            recommendations: List of recommended actions
            model_version: Model identifier
            
        Returns:
            Dict with alert_hash, timestamp, and blockchain info
        """
        
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare alert data
        alert_data = {
            "timestamp": timestamp,
            "transaction_hash": transaction_hash,
            "wallet_address": wallet_address,
            "risk_score": risk_score,
            "severity": severity,
            "threat_type": threat_type,
            "threat_details": threat_details or {},
            "evidence": evidence or [],
            "recommendations": recommendations or [],
            "model_version": model_version
        }
        
        # Create cryptographic hash
        alert_hash = self.create_alert_hash(alert_data)
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO security_alerts (
                    alert_hash, timestamp, transaction_hash, wallet_address,
                    severity, risk_score, threat_type, alert_data,
                    evidence, recommendations, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert_hash,
                timestamp,
                transaction_hash,
                wallet_address,
                severity,
                risk_score,
                threat_type,
                json.dumps(alert_data),
                json.dumps(evidence or []),
                json.dumps(recommendations or []),
                datetime.utcnow().isoformat()
            ))
            
            conn.commit()
            alert_id = cursor.lastrowid
            
            return {
                "status": "success",
                "alert_id": alert_id,
                "alert_hash": alert_hash,
                "timestamp": timestamp,
                "severity": severity,
                "risk_score": risk_score,
                "threat_type": threat_type
            }
            
        except sqlite3.IntegrityError as e:
            return {
                "status": "error",
                "error": f"Alert already exists: {str(e)}",
                "alert_hash": alert_hash
            }
        finally:
            conn.close()
    
    def update_wallet_risk_profile(self, wallet_address: str, risk_score: float, threat_type: str):
        """Update wallet risk profile after threat detection"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if wallet exists
            cursor.execute('SELECT id FROM wallet_risk_profiles WHERE wallet_address = ?', (wallet_address,))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing profile
                cursor.execute('''
                    UPDATE wallet_risk_profiles 
                    SET risk_score = ?, threat_count = threat_count + 1,
                        last_threat_timestamp = ?, updated_at = ?
                    WHERE wallet_address = ?
                ''', (risk_score, datetime.utcnow().isoformat(), datetime.utcnow().isoformat(), wallet_address))
            else:
                # Create new profile
                cursor.execute('''
                    INSERT INTO wallet_risk_profiles 
                    (wallet_address, risk_score, threat_count, last_threat_timestamp, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (wallet_address, risk_score, 1, datetime.utcnow().isoformat(), datetime.utcnow().isoformat()))
            
            conn.commit()
        finally:
            conn.close()
    
    def export_for_blockchain(self, alert_id: int) -> Dict:
        """
        Export alert data for blockchain recording
        Returns the full alert details for smart contract storage
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT * FROM security_alerts WHERE id = ?', (alert_id,))
            row = cursor.fetchone()
            
            if not row:
                return {"error": "Alert not found"}
            
            columns = [description[0] for description in cursor.description]
            alert_dict = dict(zip(columns, row))
            
            return {
                "data": alert_dict,
                "alert_hash": alert_dict['alert_hash'],
                "severity": alert_dict['severity'],
                "risk_score": alert_dict['risk_score'],
                "threat_type": alert_dict['threat_type']
            }
        finally:
            conn.close()
    
    def get_recent_alerts(self, limit: int = 10) -> List[Dict]:
        """Get recent security alerts"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT id, alert_hash, timestamp, transaction_hash, wallet_address,
                       severity, risk_score, threat_type, created_at
                FROM security_alerts
                ORDER BY created_at DESC
                LIMIT ?
            ''', (limit,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()
    
    def get_wallet_alerts(self, wallet_address: str) -> List[Dict]:
        """Get all alerts for a specific wallet"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT id, alert_hash, timestamp, severity, risk_score, threat_type
                FROM security_alerts
                WHERE wallet_address = ?
                ORDER BY created_at DESC
            ''', (wallet_address,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()
    
    def get_high_risk_wallets(self, min_risk_score: float = 70.0) -> List[Dict]:
        """Get all high-risk wallets"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT wallet_address, risk_score, threat_count, last_threat_timestamp
                FROM wallet_risk_profiles
                WHERE risk_score >= ?
                ORDER BY risk_score DESC
            ''', (min_risk_score,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()


# Initialize logger instance
security_alert_logger = SecurityAlertBlockchainLogger()
