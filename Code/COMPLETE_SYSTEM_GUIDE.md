# IntelliDex Complete System - Quick Start Guide

## System Architecture

Your IntelliDex platform now has a **complete end-to-end integration** with two separate blockchain modules:

1. **PACKAGE A** - ML Prediction Verification (existing)
2. **PACKAGE D** - Security Alerts & Threat Detection (existing)
3. **PACKAGE E** - Trade Execution Logging & Monitoring (NEW)

---

## Services Overview

### 1. Hardhat Blockchain Node
- Maintains two separate smart contracts
- Records predictions and trade executions
- Provides immutable audit trail

### 2. Flask API Server  
- Hosts ML fraud detector (trained on Bitcoin data)
- Provides endpoints for trading and security
- Manages blockchain logging

### 3. React Web Application
- **Trading Page**: Execute manual trades + manage bots
- **Security Monitor Page**: View all transactions/executions with risk analysis
- **Trading Bots Page**: Start/stop automated trading strategies

---

## Quick Start (5 Steps)

### Step 1: Ensure Flask API Server is Running

The API server loads the trained fraud detector on startup.

```bash
cd d:\projects\major project\intellidex-trader-main\automation\finale
python api_server.py
```

You should see:
```
======================================================================
  IntelliDex ML API Server
  Port: 5001
  Model: ...best_multi_task_transformer.pth
  Data: ...btc_unified_data.csv
======================================================================
📂 Loading trained fraud detector from trained_fraud_detector.pkl...
✅ Model loaded successfully!
```

### Step 2: Start Hardhat Blockchain (if not running)

```bash
cd d:\projects\major project\intellidex-trader-main\blockchain_node
npm install
npx hardhat node
```

Keep this running in a separate terminal.

### Step 3: Start React Development Server

```bash
cd d:\projects\major project\intellidex-trader-main
npm run dev
```

Navigate to: http://localhost:5173

### Step 4: Test Manual Trade Execution

1. Go to **Trading** page
2. Select a symbol (BTCUSDT, ETHUSDT, etc.)
3. Enter amount and click **Buy/Sell**
4. Trade executes locally and logs to blockchain via `/api/trading/log-execution`

### Step 5: View in Security Monitor

1. Go to **Security Monitor** page
2. You should see your trade execution in the table:
   - Shows execution type (MANUAL)
   - Risk score from trained ML model
   - Status (LOW, MEDIUM, HIGH, CRITICAL)
   - Blockchain transaction hash

---

## Testing Scenarios

### Scenario A: Manual Trade Execution

```
1. Trading Page → Buy 0.5 BTC @ market price
   ↓
2. Trade executed locally in React
   ↓
3. Triggers: POST /api/trading/log-execution
   ↓
4. Backend analysis:
   - Stores in SQLite (trade_execution_ledger.db)
   - Analyzes with trained ML model
   - Calculates risk score
   - Records blockchain tx hash
   ↓
5. Security Monitor shows:
   - Transaction table entry
   - Risk score and severity
   - Execution type: MANUAL
   ↓
6. If risk_score > 70:
   - Logs to PACKAGE D security alerts
   - Updates wallet risk profile
```

### Scenario B: Grid Bot Trade Execution

```
1. Trading Bots Page → Start Grid Bot
   ↓
2. Bot runs in gridTradingBot.ts
   ↓
3. Bot detects signal → executes 0.1 BTC buy
   ↓
4. Triggers: POST /api/trading/log-execution
   with execution_type: 'grid_bot'
   ↓
5. Backend analysis:
   - Links to bot_id in database
   - Tracks bot performance metrics
   - Stores all bot trades in bot_performance table
   - Analyzes with ML model
   ↓
6. Security Monitor shows:
   - Bot trade with "GRID BOT" badge
   - Risk analysis
   - Can see bot performance stats
   ↓
7. Bot metrics updated:
   - total_executions += 1
   - total_pnl += execution_pnl
   - win_rate recalculated
```

### Scenario C: High-Risk Detection

```
Manual trade for very high amount (>$50,000):
   ↓
Risk calculation:
   - Large amount: +20 risk points
   - Unusual time patterns: +15 risk points
   - High volatility: +10 risk points
   Total: 45+ risk score → MEDIUM/HIGH
   ↓
Security Alert triggered:
   - PACKAGE D logs to security_alerts.db
   - Updates wallet_risk_profiles
   - Appears in Security Monitor as alert
```

---

## API Endpoints Reference

### Trading Execution Endpoints

#### Log Trade Execution
```
POST /api/trading/log-execution

Request body:
{
  "execution_id": "unique-id-12345",
  "execution_type": "manual" | "grid_bot" | "trend_bot" | "swing_bot",
  "symbol": "BTCUSDT",
  "side": "buy" | "sell",
  "amount": 0.5,
  "price": 25000,
  "fee": 12.5,
  "position_id": "optional",
  "bot_id": "optional"
}

Response:
{
  "success": true,
  "execution": {
    "status": "success",
    "execution_id": "...",
    "tx_hash": "0x...",
    "security_analysis": {
      "risk_score": 35,
      "severity": "low",
      "threat_type": "none"
    }
  }
}
```

#### Get Trade Executions
```
GET /api/trading/get-executions?limit=20&symbol=BTCUSDT

Response:
{
  "success": true,
  "executions": [
    {
      "hash": "0x...",
      "timestamp": "2026-03-05T...",
      "from": "0x...",
      "to": "0x...",
      "amount": "12500",
      "type": "manual",
      "riskScore": 35,
      "status": "low"
    },
    ...
  ],
  "alertStats": {
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 13
  }
}
```

#### Get Bot Performance
```
GET /api/trading/bot-performance?bot_id=grid_bot_12345

Response:
{
  "success": true,
  "bot_performance": {
    "bot_id": "grid_bot_12345",
    "bot_type": "grid",
    "total_executions": 42,
    "total_pnl": 1250.50,
    "win_rate": 64.3,
    "total_fee": 105.25,
    "status": "active",
    "last_execution": "2026-03-05T..."
  }
}
```

#### Get Execution Statistics
```
GET /api/trading/execution-statistics?symbol=BTCUSDT

Response:
{
  "success": true,
  "statistics": [
    {
      "symbol": "BTCUSDT",
      "execution_type": "manual",
      "total_executions": 25,
      "total_volume": 312500,
      "total_pnl": 5230.50,
      "win_rate": 68.0,
      "avg_fee": 125.50
    },
    {
      "symbol": "BTCUSDT",
      "execution_type": "grid_bot",
      "total_executions": 42,
      "total_volume": 525000,
      "total_pnl": 12450.75,
      "win_rate": 71.4,
      "avg_fee": 210.25
    }
  ]
}
```

### Security Monitoring Endpoints

#### Analyze Transaction
```
POST /api/security/analyze-transaction

Request:
{
  "transaction": {
    "from_address": "0x...",
    "to_address": "0x...",
    "value_eth": 12.5,
    "gas_price_gwei": 50,
    "timestamp": "2026-03-05T..."
  }
}

Response:
{
  "success": true,
  "analysis": {
    "risk_score": 45,
    "severity": "medium",
    "threat_type": "unusual_pattern",
    "evidence": [...]
  }
}
```

#### Get High-Risk Wallets
```
GET /api/security/high-risk-wallets

Response:
{
  "success": true,
  "high_risk_wallets": [
    {
      "address": "0x...",
      "risk_score": 85,
      "severity": "critical",
      "last_activity": "2026-03-05T...",
      "threat_count": 12
    }
  ]
}
```

---

## Database Inspection

### Check Trade Executions
```bash
cd automation\finale
sqlite3 trade_execution_ledger.db

# View recent executions
SELECT execution_id, symbol, side, amount, price, 
       (amount * price) as total_value, pnl, execution_type
FROM trade_executions
ORDER BY timestamp DESC LIMIT 10;

# Check bot performance
SELECT bot_id, bot_type, total_executions, total_pnl, win_rate
FROM bot_performance;

# View statistics by symbol
SELECT symbol, execution_type, total_executions, total_volume, 
       total_pnl, win_rate FROM execution_statistics;

.quit
```

### Check Security Alerts
```bash
sqlite3 security_alerts.db

SELECT alert_id, risk_score, severity, threat_type, timestamp
FROM security_alerts
ORDER BY timestamp DESC LIMIT 10;

.quit
```

---

## Troubleshooting

### Issue: "Fraud detector model not trained"

**Solution**: Train the model first
```bash
cd automation\finale
python train_fraud_detector.py
```

### Issue: Trade not appearing in Security Monitor

**Solution**:
1. Check Flask API server is running: `curl http://localhost:5001/api/health`
2. Check error logs in Flask terminal
3. Verify trade was logged: `sqlite3 trade_execution_ledger.db "SELECT * FROM trade_executions LIMIT 1;"`

### Issue: Hardhat blockchain connection error

**Solution**:
1. Kill existing node on port 8545: `taskkill /PID <PID> /F`
2. Restart Hardhat: `npx hardhat node`
3. Or use different port: Edit `hardhat.config.js`

### Issue: React can't connect to API server

**Solution**:
1. Verify API running: `curl http://localhost:5001/api/health`
2. Check CORS: Flask should allow localhost:5173
3. Check terminal for connection errors

---

## Performance Metrics

### Security Monitor Dashboard Shows:

1. **Alert Statistics**
   - Critical: executions with risk_score 80+
   - High: risk_score 60-79
   - Medium: risk_score 30-59
   - Safe: risk_score < 30

2. **Execution Data**
   - All manual trades logged and analyzed
   - All bot trades logged with bot_id and type
   - P&L calculated for each execution
   - Risk score from ML model

3. **Bot Performance**
   - Total executions per bot
   - Win rate and total P&L
   - Average trade size and fee
   - Last execution timestamp

---

## Next Steps

1. **Customize Risk Thresholds**
   - Edit `_calculate_execution_risk()` in `PACKAGE_E_trade_execution_logger.py`
   - Adjust risk weights for your trading style

2. **Add More Indicators**
   - Enhance ML feature extraction in `_calculate_execution_risk()`
   - Include volatility, volume patterns, etc.

3. **Integrate with Real Exchange**
   - Replace mock tradingService with real Binance API
   - Update `executeMarketOrder()` to use actual exchange

4. **Deploy to Production**
   - Deploy Flask API to server
   - Deploy React app to CDN
   - Use mainnet or testnet blockchain
   - Implement proper authentication

---

## Support

For issues or questions:
- Check logs in Flask terminal
- Inspect databases: `sqlite3 *.db`
- Review API responses in browser dev tools
- Check blockchain transactions in Hardhat logs
