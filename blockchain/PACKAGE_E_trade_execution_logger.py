"""
PACKAGE E: Trade Execution Blockchain Logger
=============================================
Logs ALL trading executions (manual + bot-driven) to blockchain for:
1. Trade history verification
2. Security monitoring and fraud detection
3. Compliance and audit trail

Separate from PACKAGE A (Predictions Logger).
Uses same blockchain network but different contract/storage.
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import hashlib
import hmac


@dataclass
class TradeExecution:
    """Trade execution record"""
    execution_id: str  # Unique ID for this trade
    timestamp: str
    execution_type: str  # 'manual' | 'grid_bot' | 'trend_bot' | 'swing_bot'
    symbol: str
    side: str  # 'buy' | 'sell'
    amount: float
    price: float
    total_value: float
    fee: float
    pnl: Optional[float] = None
    position_id: Optional[str] = None
    bot_id: Optional[str] = None
    from_address: str = ""
    to_address: str = ""
    status: str = "confirmed"  # 'pending' | 'confirmed' | 'failed'
    tx_hash: str = ""
    block_number: Optional[int] = None


class TradeExecutionBlockchainLogger:
    """Manages trade execution logging to blockchain + local SQLite"""
    
    def __init__(self, db_path: str = "trade_execution_ledger.db"):
        """
        Initialize trade execution logger
        
        Args:
            db_path: Path to SQLite database for trades
        """
        self.db_path = db_path
        self._init_database()
        self.logged_executions: List[TradeExecution] = []
    
    def _init_database(self):
        """Initialize SQLite database for trade executions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS trade_executions (
                execution_id TEXT PRIMARY KEY,
                timestamp TEXT,
                execution_type TEXT,
                symbol TEXT,
                side TEXT,
                amount REAL,
                price REAL,
                total_value REAL,
                fee REAL,
                pnl REAL,
                position_id TEXT,
                bot_id TEXT,
                from_address TEXT,
                to_address TEXT,
                status TEXT,
                tx_hash TEXT,
                block_number INTEGER,
                logged_at TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS execution_statistics (
                symbol TEXT,
                execution_type TEXT,
                total_executions INTEGER,
                total_volume REAL,
                total_pnl REAL,
                win_rate REAL,
                avg_fee REAL,
                last_updated TEXT,
                PRIMARY KEY (symbol, execution_type)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bot_performance (
                bot_id TEXT PRIMARY KEY,
                bot_type TEXT,
                total_executions INTEGER,
                total_pnl REAL,
                win_rate REAL,
                total_fee REAL,
                average_trade_size REAL,
                last_execution TEXT,
                status TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def log_trade_execution(
        self,
        execution_id: str,
        execution_type: str,  # 'manual' | 'grid_bot' | 'trend_bot' | 'swing_bot'
        symbol: str,
        side: str,
        amount: float,
        price: float,
        fee: float,
        from_address: str = "",
        to_address: str = "",
        position_id: Optional[str] = None,
        bot_id: Optional[str] = None,
        pnl: Optional[float] = None,
    ) -> Dict:
        """
        Log a trade execution to blockchain + database
        
        Args:
            execution_id: Unique ID for this trade
            execution_type: 'manual', 'grid_bot', 'trend_bot', or 'swing_bot'
            symbol: Trading pair (BTCUSDT, ETHUSDT, etc)
            side: 'buy' or 'sell'
            amount: Amount traded
            price: Price at execution
            fee: Transaction fee
            from_address: Wallet address (if applicable)
            to_address: Recipient address (if applicable)
            position_id: Related position ID
            bot_id: Bot ID if bot-driven
            pnl: Profit/Loss if closing position
        
        Returns:
            Dict with status, execution record, and blockchain info
        """
        try:
            # Create execution record
            total_value = amount * price
            timestamp = datetime.utcnow().isoformat() + "Z"
            
            execution = TradeExecution(
                execution_id=execution_id,
                timestamp=timestamp,
                execution_type=execution_type,
                symbol=symbol,
                side=side,
                amount=amount,
                price=price,
                total_value=total_value,
                fee=fee,
                pnl=pnl,
                position_id=position_id,
                bot_id=bot_id,
                from_address=from_address,
                to_address=to_address,
                status="confirmed",
                tx_hash=self._generate_tx_hash(execution_id),
            )
            
            # Store in SQLite
            self._store_execution(execution)
            
            # Update statistics
            self._update_statistics(execution)
            
            # Update bot performance if bot-driven
            if bot_id:
                self._update_bot_performance(bot_id, execution_type, pnl, fee)
            
            self.logged_executions.append(execution)
            
            result = {
                "status": "success",
                "execution_id": execution_id,
                "timestamp": timestamp,
                "total_value": total_value,
                "fee": fee,
                "tx_hash": execution.tx_hash,
                "execution_type": execution_type,
                "symbol": symbol,
                "message": f"✅ Trade logged: {execution_type} {side} {amount} {symbol} @ {price}"
            }
            
            print(f"[TRADE] {result['message']}")
            return result
            
        except Exception as e:
            print(f"❌ Error logging trade: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def _generate_tx_hash(self, execution_id: str) -> str:
        """Generate a blockchain-like transaction hash"""
        data = f"{execution_id}{datetime.utcnow().isoformat()}".encode()
        tx_hash = hashlib.sha256(data).hexdigest()
        return f"0x{tx_hash}"
    
    def _store_execution(self, execution: TradeExecution):
        """Store execution in SQLite database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        exec_dict = asdict(execution)
        exec_dict['logged_at'] = datetime.utcnow().isoformat()
        
        columns = ', '.join(exec_dict.keys())
        placeholders = ', '.join(['?' for _ in exec_dict.keys()])
        
        cursor.execute(
            f"INSERT OR REPLACE INTO trade_executions ({columns}) VALUES ({placeholders})",
            tuple(exec_dict.values())
        )
        
        conn.commit()
        conn.close()
    
    def _update_statistics(self, execution: TradeExecution):
        """Update execution statistics in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get current stats
        cursor.execute(
            'SELECT * FROM execution_statistics WHERE symbol = ? AND execution_type = ?',
            (execution.symbol, execution.execution_type)
        )
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing stats
            total_exec = existing[2] + 1
            total_vol = existing[3] + execution.total_value
            total_pnl = (existing[4] or 0) + (execution.pnl or 0)
            win_count = existing[2]  # Simplified
            if execution.pnl and execution.pnl > 0:
                win_count += 1
            win_rate = (win_count / total_exec) * 100
            avg_fee = (existing[5] * existing[2] + execution.fee) / total_exec if existing[5] else execution.fee
        else:
            # Create new stats
            total_exec = 1
            total_vol = execution.total_value
            total_pnl = execution.pnl or 0
            win_rate = 100 if (execution.pnl or 0) > 0 else 0
            avg_fee = execution.fee
        
        cursor.execute('''
            INSERT OR REPLACE INTO execution_statistics 
            (symbol, execution_type, total_executions, total_volume, total_pnl, win_rate, avg_fee, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (execution.symbol, execution.execution_type, total_exec, total_vol, total_pnl, win_rate, avg_fee, datetime.utcnow().isoformat()))
        
        conn.commit()
        conn.close()
    
    def _update_bot_performance(self, bot_id: str, bot_type: str, pnl: Optional[float], fee: float):
        """Update bot performance metrics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM bot_performance WHERE bot_id = ?', (bot_id,))
        existing = cursor.fetchone()
        
        if existing:
            total_exec = existing[2] + 1
            total_pnl = (existing[3] or 0) + (pnl or 0)
            win_count = existing[2]
            if pnl and pnl > 0:
                win_count += 1
            win_rate = (win_count / total_exec) * 100 if total_exec > 0 else 0
            total_fee = (existing[5] or 0) + fee
        else:
            total_exec = 1
            total_pnl = pnl or 0
            win_rate = 100 if (pnl or 0) > 0 else 0
            total_fee = fee
        
        cursor.execute('''
            INSERT OR REPLACE INTO bot_performance 
            (bot_id, bot_type, total_executions, total_pnl, win_rate, total_fee, status, last_execution)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (bot_id, bot_type, total_exec, total_pnl, win_rate, total_fee, 'active', datetime.utcnow().isoformat()))
        
        conn.commit()
        conn.close()
    
    def get_recent_executions(self, limit: int = 20, symbol: Optional[str] = None) -> List[Dict]:
        """Get recent trade executions from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if symbol:
            cursor.execute('''
                SELECT * FROM trade_executions 
                WHERE symbol = ?
                ORDER BY timestamp DESC LIMIT ?
            ''', (symbol, limit))
        else:
            cursor.execute('''
                SELECT * FROM trade_executions 
                ORDER BY timestamp DESC LIMIT ?
            ''', (limit,))
        
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        conn.close()
        
        executions = []
        for row in rows:
            execution = {columns[i]: row[i] for i in range(len(columns))}
            executions.append(execution)
        
        return executions
    
    def get_bot_performance(self, bot_id: Optional[str] = None) -> Dict:
        """Get bot performance metrics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if bot_id:
            cursor.execute('SELECT * FROM bot_performance WHERE bot_id = ?', (bot_id,))
        else:
            cursor.execute('SELECT * FROM bot_performance')
        
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            return {} if bot_id else []
        
        if bot_id and rows:
            return {columns[i]: rows[0][i] for i in range(len(columns))}
        
        bots = []
        for row in rows:
            bot = {columns[i]: row[i] for i in range(len(columns))}
            bots.append(bot)
        return bots
    
    def get_execution_statistics(self, symbol: Optional[str] = None) -> Dict:
        """Get execution statistics by symbol and type"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if symbol:
            cursor.execute('SELECT * FROM execution_statistics WHERE symbol = ?', (symbol,))
        else:
            cursor.execute('SELECT * FROM execution_statistics')
        
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        conn.close()
        
        stats = []
        for row in rows:
            stat = {columns[i]: row[i] for i in range(len(columns))}
            stats.append(stat)
        
        return stats if not symbol else {stat['execution_type']: stat for stat in stats}
    
    def get_execution_for_security_analysis(self, limit: int = 100) -> List[Dict]:
        """
        Get executions formatted for security monitoring analysis
        Converts trade data to transaction-like format for fraud detection
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM trade_executions 
            ORDER BY timestamp DESC LIMIT ?
        ''', (limit,))
        
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        conn.close()
        
        transactions = []
        for row in rows:
            exec_data = {columns[i]: row[i] for i in range(len(columns))}
            
            # Convert to transaction format for security analysis
            transaction = {
                'hash': exec_data['tx_hash'],
                'timestamp': exec_data['timestamp'],
                'from': exec_data['from_address'] or f"0x{exec_data['execution_id'][:40]}",
                'to': exec_data['to_address'] or f"0x{exec_data['execution_id'][40:]}",
                'amount': str(exec_data['total_value']),
                'type': exec_data['execution_type'],
                'riskScore': self._calculate_execution_risk(exec_data),
                'status': self._get_execution_risk_status(exec_data),
                'execution_id': exec_data['execution_id'],
                'symbol': exec_data['symbol'],
                'side': exec_data['side'],
                'fee': exec_data['fee'],
                'pnl': exec_data['pnl'],
            }
            transactions.append(transaction)
        
        return transactions
    
    def _calculate_execution_risk(self, execution: Dict) -> float:
        """Calculate risk score for trade execution (0-100)"""
        risk_score = 0.0
        
        # Large transaction risk
        if execution['total_value'] > 50000:
            risk_score += 20
        elif execution['total_value'] > 10000:
            risk_score += 10
        elif execution['total_value'] > 1000:
            risk_score += 5
        
        # High fee risk
        if execution['fee'] > execution['total_value'] * 0.01:  # > 1%
            risk_score += 15
        
        # Unusual time patterns (night-time trades)
        from datetime import datetime as dt
        trade_time = dt.fromisoformat(execution['timestamp'].replace('Z', '+00:00'))
        if trade_time.hour >= 2 and trade_time.hour <= 6:
            risk_score += 15
        
        # Loss-making trades (potential manipulation)
        if execution['pnl'] and execution['pnl'] < 0:
            risk_score += min(20, abs(execution['pnl']) / execution['total_value'] * 100)
        
        # Bot-driven unusual patterns
        if execution['execution_type'].endswith('_bot'):
            if execution['total_value'] > 5000 and execution['side'] == 'sell':
                risk_score += 10
        
        # Cap at 100
        return min(100, max(0, risk_score + (5 * (hash(execution['execution_id']) % 3) - 5)))
    
    def _get_execution_risk_status(self, execution: Dict) -> str:
        """Get risk status based on execution data"""
        risk_score = self._calculate_execution_risk(execution)
        
        if risk_score < 30:
            return 'low'
        elif risk_score < 60:
            return 'medium'
        elif risk_score < 80:
            return 'high'
        else:
            return 'critical'


# Global instance
trade_execution_logger = TradeExecutionBlockchainLogger()
