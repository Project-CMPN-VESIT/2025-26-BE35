# IntelliDex Blockchain Architecture

## Overview

The IntelliDex platform uses **TWO separate blockchain modules** to maintain clear separation of concerns:

1. **PACKAGE A**: Prediction Verification & ML Model Logging
2. **PACKAGE E**: Trade Execution Logging & Security Monitoring

Both modules use the same blockchain network but maintain separate smart contracts, databases, and data structures.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        React Web Application                             │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │   Trading Page   │  │  Security       │  │  Predictions Page    │   │
│  │ (Manual + Bots)  │  │  Monitor Page   │  │ (Performance Metrics) │   │
│  └──────────────────┘  └─────────────────┘  └──────────────────────┘   │
│         │                      │                        │                │
└─────────────────────────────────────────────────────────────────────────┘
         │                      │                        │
         ↓                      ↓                        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                          Flask API Server (Port 5001)                    │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ /api/trading/*       │  │ /api/security/*  │  │ /api/*          │  │
│  │ Execute & Log Trades │  │ Analyze & Monitor│  │ Predictions     │  │
│  └──────────────────────┘  └──────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │                      │                        │
         ↓                      ↓                        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   Python Backend Services Layer                          │
│  ┌────────────────────────┐  ┌────────────────────┐  ┌──────────────┐ │
│  │ PACKAGE E (NEW)        │  │ PACKAGE D (NEW)    │  │ PACKAGE A    │ │
│  │ Trade Execution Logger │  │ Security Alerts    │  │ Predictions  │ │
│  │                        │  │                    │  │ Logger       │ │
│  │ • Log bot trades       │  │ • Analyze threats  │  │              │ │
│  │ • Log manual trades    │  │ • Log alerts       │  │ • Verify     │ │
│  │ • Calculate risk       │  │ • Track wallets    │  │   models     │ │
│  │ • Store in SQLite      │  │ • Store in SQLite  │  │ • Archive    │ │
│  └────────────────────────┘  └────────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
         │                      │                        │
         ↓                      ↓                        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      Hardhat Blockchain Network                          │
│  ┌──────────────────────────┐  ┌──────────────────────────────────────┐│
│  │ SMART CONTRACT A:        │  │ SMART CONTRACT E:                    ││
│  │ PredictionVerifier.sol   │  │ TradeExecutionLogger.sol             ││
│  │                          │  │                                      ││
│  │ • Stores model hashes    │  │ • Records trade events               ││
│  │ • Verifies predictions   │  │ • Tracks bot performance             ││
│  │ • Maintains audit trail  │  │ • Enables forensics                  ││
│  └──────────────────────────┘  └──────────────────────────────────────┘│
│                                                                           │
│  ✅ Transactions Immutable | ✅ Timestamp Secured | ✅ Auditable        │
└─────────────────────────────────────────────────────────────────────────┘
         │                      │
         ↓                      ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                         Local SQLite Databases                           │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ trade_execution_ledger.db      │  │ security_alerts.db             │ │
│  │                                │  │                                │ │
│  │ • trade_executions             │  │ • alerts                       │ │
│  │ • execution_statistics         │  │ • wallet_risk_profiles         │ │
│  │ • bot_performance              │  │ • threat_intelligence         │ │
│  └────────────────────────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Module 1: PACKAGE A - Prediction Verification (EXISTING)

### Purpose
- Log ML model predictions to blockchain
- Verify prediction accuracy after outcome becomes known
- Maintain immutable audit trail of all model outputs
- Store IPFS hashes for model versioning

### Files
- `blockchain/PACKAGE_A_blockchain_logger.py` - Prediction logger
- `blockchain/PACKAGE_A_ipfs_storage.py` - IPFS integration
- Predictions database: `prediction_verification.db`

### Data Flow

```
Training Pipeline
    ↓
best_multi_task_transformer.pth (trained model)
    ↓
API: /api/predictions/log-blockchain
    ↓
PACKAGE_A logs to:
  ├─ Hardhat Smart Contract (hash + metadata)
  ├─ IPFS (full model binary)
  └─ SQLite (prediction_verification.db)
    ↓
React: Predictions Page displays verified predictions
```

### Key Endpoints
- `POST /api/predictions/log-blockchain` - Log prediction to blockchain
- `GET /api/blockchain/logs` - Get prediction blockchain logs

### Data Stored
- Model version, prediction values, timestamp, transaction hash on blockchain
- Full IPFS hash for model retrieval
- Accuracy metrics after outcome verified

---

## Module 2: PACKAGE E - Trade Execution Logging (NEW)

### Purpose
- Log ALL trade executions (manual + bot-driven) to blockchain
- Enable security monitoring and fraud detection
- Track bot performance metrics
- Create immutable execution audit trail

### Files
- `blockchain/PACKAGE_E_trade_execution_logger.py` - Trade logger
- Trade execution database: `trade_execution_ledger.db`
- Smart contract: `PACKAGE_E_smart_contracts.sol` (same network as PACKAGE A)

### Architecture

```
┌─── User Manual Trade ────────────────────────────────────┐
│  1. User clicks "Buy 0.5 BTC" on Trading page           │
│  2. Trade executed locally in React state               │
│  3. useRealTimeData.executeTrade() called               │
│  4. Trade logged via POST /api/trading/log-execution   │
│  5. PACKAGE E analyzes security with trained ML         │
│  6. High-risk trades logged to PACKAGE D alerts         │
│  7. Execution appears in Security Monitor page          │
└────────────────────────────────────────────────────────┘

┌─── Bot-Driven Trade ────────────────────────────────────┐
│  1. Grid/Trend/Swing bot running in BotManager         │
│  2. Bot calls tradingService.executeMarketOrder()      │
│  3. Trade created + logged via /api/trading/log-execution │
│  4. execution_type = 'grid_bot' | 'trend_bot' | 'swing_bot' │
│  5. Bot ID and performance tracked                      │
│  6. P&L calculated and stored for bot metrics          │
│  7. Execution appears in Security Monitor page          │
└────────────────────────────────────────────────────────┘
```

### Files Modified

**API Server** (`automation/finale/api_server.py`):
```python
@app.route("/api/trading/log-execution", methods=["POST"])
- Logs trade execution to blockchain + security system
- Analyzes with trained ML fraud detector
- Logs high-risk trades to security alerts

@app.route("/api/trading/get-executions", methods=["GET"])
- Returns all trade executions for Security Monitor UI
- Includes risk analysis per execution

@app.route("/api/trading/bot-performance", methods=["GET"])
- Returns bot performance metrics (win rate, P&L, etc.)

@app.route("/api/trading/execution-statistics", methods=["GET"])
- Returns statistics by symbol and type
```

**Trading Hook** (`src/hooks/useRealTimeData.ts`):
- `executeTrade()`: Logs manual trades to `/api/trading/log-execution`
- `closePosition()`: Logs closing trades with P&L

**Security Service** (`src/services/securityService.ts`):
- `fetchRecentTransactions()`: Now fetches trade executions from blockchain
- `fetchTradeExecutions()`: New method for detailed execution history

**Security Monitoring Page** (`src/pages/SecurityMonitor.tsx`):
- Shows both test transactions AND actual trade executions
- Displays bot-driven trades with execution type
- Shows risk scores from trained ML model
- Tracks high-risk wallets

### Data Stored

**trade_execution_ledger.db** tables:

1. `trade_executions`
   - execution_id (unique)
   - timestamp
   - execution_type (manual | grid_bot | trend_bot | swing_bot)
   - symbol (BTCUSDT, ETHUSDT, etc.)
   - side (buy | sell)
   - amount, price, total_value, fee
   - pnl (profit/loss)
   - position_id, bot_id
   - tx_hash (blockchain reference)
   - block_number

2. `execution_statistics`
   - symbol + execution_type (grouped)
   - total_executions
   - total_volume
   - total_pnl
   - win_rate
   - avg_fee
   - last_updated

3. `bot_performance`
   - bot_id (unique)
   - bot_type (grid | trend | swing)
   - total_executions
   - total_pnl
   - win_rate
   - total_fee
   - status

---

## Key Features

### 1. Risk Analysis
Each trade execution is analyzed with the trained Isolation Forest ML model:

```python
def _calculate_execution_risk(execution: Dict) -> float:
    risk_score = 0.0
    
    # Large transaction risk
    if execution['total_value'] > 50000:
        risk_score += 20
    
    # High fee risk
    if execution['fee'] > 1%:
        risk_score += 15
    
    # Night-time trading
    if trade_time.hour >= 2 and trade_time.hour <= 6:
        risk_score += 15
    
    # Loss-making trades
    if execution['pnl'] < 0:
        risk_score += min(20, abs(pnl) / total_value * 100)
    
    # Bot-driven patterns
    if execution['execution_type'].endswith('_bot'):
        if execution['total_value'] > 5000 and execution['side'] == 'sell':
            risk_score += 10
    
    return min(100, max(0, risk_score))
```

Risk status mapping:
- `low`: 0-29
- `medium`: 30-59
- `high`: 60-79
- `critical`: 80-100

### 2. Blockchain Immutability

Both modules record transaction hashes on blockchain:

```solidity
// PACKAGE A Smart Contract
function logPrediction(bytes32 modelHash, uint256[] predictions) public
    // Records to blockchain with timestamp

// PACKAGE E Smart Contract (same network)
function logTradeExecution(
    string executionType,
    string symbol,
    string side,
    uint256 amount,
    uint256 price
) public
    // Records execution with timestamp
```

### 3. Bot Integration

When bots execute trades:

```typescript
// In Grid/Trend/Swing Bot
await tradingService.executeMarketOrder(symbol, side, amount);

// Automatically triggers:
useRealTimeData.executeTrade()
  → /api/trading/log-execution
    → PACKAGE E logs with execution_type: 'grid_bot'
      → Risk analysis
        → High-risk entries logged to PACKAGE D
          → Security Monitor displays execution
```

---

## Security Monitor Integration

The Security Monitor page displays:

1. **Test Transactions** (from `/api/security/generate-test-transactions`)
   - Simulated blockchain transactions
   - Analyzed with trained ML model
   - For demonstration purposes

2. **Trade Executions** (from `/api/trading/get-executions`)
   - Actual user trades (manual + bot-driven)
   - Logged to blockchain via PACKAGE E
   - Analyzed with trained ML model
   - Shows execution type and bot performance

3. **Risk Distribution**
   - Critical: Critical risk executions
   - High: High risk executions
   - Medium: Medium risk executions
   - Low/Safe: Normal trades

4. **High-Risk Wallets**
   - Tracked via PACKAGE D
   - Updated when trades exceed risk threshold (>70)

---

## Data Conversion

### Trade Execution → Transaction (for ML analysis)

```python
execution {
    'symbol': 'BTCUSDT',
    'side': 'buy',
    'amount': 0.5,
    'price': 25000,
    'total_value': 12500,
    'fee': 12.5,
    'execution_type': 'manual'
}
    ↓ (transforms to)
transaction {
    'value_eth': 12.5,  # total_value / 1000
    'gas_price_gwei': 0.125,  # fee / 100
    'gas_limit': 500,  # amount * 1000
    'is_contract': 0,  # 1 if bot, 0 if manual
    'token_transfers': 1,
    'timestamp': '2026-03-05T...'
}
    ↓ (ML analysis)
risk_score: 35 (low risk)
```

---

## API Endpoints Summary

### Trading Execution (PACKAGE E)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/trading/log-execution` | Log new trade execution |
| GET | `/api/trading/get-executions` | Fetch executions for monitoring |
| GET | `/api/trading/bot-performance` | Get bot performance metrics |
| GET | `/api/trading/execution-statistics` | Get execution statistics |

### Security Monitoring (PACKAGE D)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/security/analyze-transaction` | Analyze transaction/trade |
| POST | `/api/security/log-alert` | Log security alert |
| GET | `/api/security/alerts/<address>` | Get wallet alerts |
| GET | `/api/security/high-risk-wallets` | Get high-risk wallets |
| GET | `/api/security/recent-alerts` | Get recent alerts |

### Predictions (PACKAGE A)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/predictions/log-blockchain` | Log prediction to blockchain |
| GET | `/api/blockchain/logs` | Get blockchain prediction logs |

---

## Workflow Examples

### User Manual Trade Flow

```
1. User navigates to Trading page
2. User selects:
   - Symbol: BTCUSDT
   - Side: Buy
   - Amount: 0.5
3. User clicks "Execute"
4. Frontend calls:
   executeTrade('buy', 0.5, 'market')
5. Trade executes locally:
   tradingService.executeMarketOrder()
6. Backend logs to blockchain:
   POST /api/trading/log-execution {
     execution_type: 'manual',
     symbol: 'BTCUSDT',
     side: 'buy',
     amount: 0.5,
     price: 25000,
     fee: 12.5
   }
7. PACKAGE E:
   - Creates execution record
   - Stores in SQLite
   - Calculates risk score: 25 (low)
   - Logs blockchain tx hash
8. PACKAGE D:
   - Risk < threshold, no alert
9. User sees execution in:
   - Security Monitor → Transactions table
   - Shows: "0x... MANUAL BUY 0.5 BTCUSDT LOW RISK"

```

### Bot-Driven Trade Flow

```
1. User starts Grid Bot on Trading Bots page
2. Bot running in gridTradingBot.ts
3. Bot detects trading signal
4. Bot executes:
   tradingService.executeMarketOrder(symbol, 'buy', 0.1)
5. Backend logs:
   POST /api/trading/log-execution {
     execution_type: 'grid_bot',
     symbol: 'BTCUSDT',
     side: 'buy',
     amount: 0.1,
     price: 25050,
     fee: 2.5,
     bot_id: 'grid_bot_12345'
   }
6. PACKAGE E:
   - Records: execution_type = 'grid_bot'
   - Links to bot_id
   - Stores in SQLite
   - Updates bot_performance table
   - Risk check: 15 (low)
7. PACKAGE D:
   - No alert needed
8. User sees in Security Monitor:
   - Execution with type badge "GRID BOT"
   - Bot performance stats updated
   - Can click to see bot metrics

```

---

## Testing the System

### 1. Start Flask API Server
```bash
cd automation/finale
python api_server.py
```

Should show model loaded + fraud detector loaded

### 2. Start React Development Server
```bash
npm run dev
```

Navigate to http://localhost:5173

### 3. Test Manual Trade
- Go to Trading page
- Execute a buy order
- Check Security Monitor - should see execution appear

### 4. Test Bot-Driven Trade
- Go to Trading Bots page
- Start Grid Bot
- Wait for bot to execute
- Check Security Monitor - should see bot trades appear

### 5. Verify Blockchain Logging
```bash
# Check trade execution database
sqlite3 automation/finale/trade_execution_ledger.db
SELECT * FROM trade_executions LIMIT 5;
SELECT * FROM bot_performance;
```

---

## Database Queries

### Recent Trade Executions
```sql
SELECT execution_id, timestamp, symbol, side, amount, price, risk_score
FROM trade_executions
ORDER BY timestamp DESC LIMIT 20;
```

### Bot Performance
```sql
SELECT bot_id, bot_type, total_executions, total_pnl, win_rate
FROM bot_performance
ORDER BY total_pnl DESC;
```

### High-Risk Executions
```sql
SELECT execution_id, symbol, execution_type, risk_score, pnl
FROM trade_executions
WHERE risk_score > 70
ORDER BY risk_score DESC;
```

### Execution Statistics by Symbol
```sql
SELECT symbol, execution_type, total_executions, total_volume, total_pnl, win_rate
FROM execution_statistics
ORDER BY symbol, execution_type;
```

---

## Conclusion

This two-module blockchain architecture provides:

✅ **Prediction Integrity** (PACKAGE A) - Immutable proof of model predictions
✅ **Trade Audit Trail** (PACKAGE E) - Complete record of all executions
✅ **Security Monitoring** (PACKAGE D) - Real-time anomaly detection
✅ **Bot Transparency** - Track automated trading performance
✅ **User Accountability** - Prove manual vs. bot trades
✅ **Regulatory Compliance** - Auditable transaction history

All three modules (A, D, E) work together to provide a comprehensive, secure, and transparent trading platform.
