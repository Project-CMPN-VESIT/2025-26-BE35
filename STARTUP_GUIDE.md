# IntelliDex - Complete Startup Guide

Run all services in the correct order to launch the entire system.

---

## Prerequisites Check

Before starting, verify you have:

✅ Node.js 18+ installed  
✅ Python 3.9+ installed  
✅ npm installed  
✅ All dependencies installed  

Check versions:
```powershell
node --version
python --version
npm --version
```

---

## Service Startup Order

### **Step 1: Start Hardhat Blockchain Node** (Terminal 1)

This runs the blockchain network for logging predictions and trades.

```powershell
cd "d:\projects\major project\intellidex-trader-main\blockchain_node"
npm install  # Run once if modules missing
npx hardhat node
```

**Expected Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
0x... (multiple accounts listed)

No account found at index 0
```

**Port:** 8545  
**Status:** ✅ Ready when you see "JSON-RPC server"

---

### **Step 2: Start Flask API Server** (Terminal 2)

This runs the ML fraud detector, handles trade logging, and provides API endpoints.

```powershell
cd "d:\projects\major project\intellidex-trader-main\automation\finale"
python api_server.py
```

**Expected Output:**
```
==================================================
  IntelliDex ML API Server
  Port: 5001
  Model: best_multi_task_transformer.pth
  Data: btc_unified_data.csv
==================================================

📂 Loading trained fraud detector from trained_fraud_detector.pkl...
✅ Model loaded successfully!
   Source: btc_unified_data.csv
   Trained: 2026-03-05T...
   Parameters: contamination=0.05, n_estimators=100, features=21

WARNING in app.run()...
 * Running on http://0.0.0.0:5001
```

**Port:** 5001  
**Status:** ✅ Ready when you see "Running on http://0.0.0.0:5001"

---

### **Step 3: Start React Development Server** (Terminal 3)

This runs the web UI where you can execute trades and monitor security.

```powershell
cd "d:\projects\major project\intellidex-trader-main"
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  build runner

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

**Port:** 5173  
**Status:** ✅ Ready when you see "http://localhost:5173"

---

## Open in Browser

Once all three services are running, open your browser:

```
http://localhost:5173
```

You should see the IntelliDex dashboard with:
- Trading page
- Security Monitor
- Trading Bots
- Other features

---

## What Each Terminal Does

| Terminal | Service | Port | Purpose |
|----------|---------|------|---------|
| 1 | Hardhat Node | 8545 | Blockchain network for logging |
| 2 | Flask API | 5001 | ML model, trade logging, analysis |
| 3 | React Dev | 5173 | Web interface |

Keep all three running while using the platform.

---

## Verify Everything is Working

### Check 1: API Server Health
```powershell
# In a new PowerShell window
curl http://localhost:5001/api/health

# Should return something like:
# {"success":true,"mlAvailable":true,"modelName":"best_multi_task_transformer.pth",...}
```

### Check 2: React App Loads
```
Browser: http://localhost:5173
Should show IntelliDex homepage
```

### Check 3: Trade Execution
1. Go to **Trading** page in browser
2. Click "Buy" button
3. Check **Security Monitor** page
4. Your trade should appear in the transactions table

### Check 4: Blockchain Node
Last terminal (Hardhat) should show new transactions being logged:
```
eth_blockNumber
eth_call
eth_sendTransaction
```

---

## Quick Test Workflow (2 minutes)

1. **Execute a Manual Trade**
   ```
   1. Trading page → Select BTCUSDT
   2. Enter amount: 0.5
   3. Click "BUY"
   4. Should see: "Bought 0.5 BTC @ $..."
   ```

2. **View in Security Monitor**
   ```
   1. Go to Security Monitor page
   2. Scroll down to Transactions table
   3. Should see your trade with:
      - Hash: 0x...
      - Amount: 0.5
      - Risk Score: low/medium
   ```

3. **Check Databases**
   ```powershell
   cd automation\finale
   sqlite3 trade_execution_ledger.db
   SELECT * FROM trade_executions LIMIT 1;
   .quit
   ```

---

## API Endpoints to Test

Once running, you can test these:

```powershell
# Health check
curl http://localhost:5001/api/health

# Generate test transactions
curl http://localhost:5001/api/security/generate-test-transactions?count=5

# Get trade executions
curl http://localhost:5001/api/trading/get-executions?limit=10

# Get bot performance
curl http://localhost:5001/api/trading/bot-performance
```

---

## Stopping Services

To stop everything safely:

### Stop React Server
```
Terminal 3: Press Ctrl+C
```

### Stop Flask API
```
Terminal 2: Press Ctrl+C
```

### Stop Hardhat Node
```
Terminal 1: Press Ctrl+C
```

---

## Troubleshooting

### Issue: Port 8545 Already in Use

**Solution:**
```powershell
# Find process using 8545
netstat -ano | findstr :8545

# Kill it
taskkill /PID <PID_NUMBER> /F

# Then restart Hardhat
```

### Issue: Port 5001 Already in Use

**Solution:**
```powershell
# Find process
netstat -ano | findstr :5001

# Kill it
taskkill /PID <PID_NUMBER> /F

# Then restart Flask
```

### Issue: "Model not found" error

**Solution:**
```powershell
# Train the model first
cd automation\finale
python train_fraud_detector.py

# This creates trained_fraud_detector.pkl
# Then restart Flask
```

### Issue: React shows "Cannot connect to API"

**Solution:**
1. Check Flask is running: `curl http://localhost:5001/api/health`
2. Check no CORS errors in browser console
3. Verify port 5001 in Flask terminal shows requests

### Issue: Hardhat "EADDRINUSE" error

**Solution:**
```powershell
# Use different port in hardhat.config.js
# Edit file, change 8545 to 8546
# Then restart Hardhat
```

---

## File Cleanup (Optional)

If you need to reset databases:

```powershell
cd automation\finale

# Remove trade executions database
Remove-Item trade_execution_ledger.db -ErrorAction SilentlyContinue

# Remove security alerts database  
Remove-Item security_alerts.db -ErrorAction SilentlyContinue

# Databases will be recreated on next API call
```

---

## Performance Tips

For smooth operation:

1. **Use SSD** - Databases are faster on solid state drives
2. **4GB+ RAM** - Allocate enough to Node, Flask, and browser
3. **Close Unnecessary Apps** - Free up system resources
4. **Update Node** - Use latest Node.js LTS version
5. **Clear Browser Cache** - Ctrl+Shift+Delete to clear

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│            Browser (http://localhost:5173)                   │
│  - Trading Page (execute manual trades)                      │
│  - Trading Bots (start/stop automated bots)                 │
│  - Security Monitor (view all trades & risk analysis)       │
└─────────────────────────────────────────────────────────────┘
         ↓↑ HTTP Requests
┌─────────────────────────────────────────────────────────────┐
│       React Dev Server (localhost:5173)                      │
│  - Serves UI components                                      │
│  - Manages state with Zustand                               │
│  - Hooks into useRealTimeData                               │
└─────────────────────────────────────────────────────────────┘
         ↓↑ API Calls (http://localhost:5001/api/*)
┌─────────────────────────────────────────────────────────────┐
│      Flask API Server (localhost:5001)                       │
│  - ML Fraud Detector (trained on Bitcoin data)              │
│  - Trade Execution Logging (PACKAGE E)                      │
│  - Security Alert System (PACKAGE D)                        │
│  - Prediction Logging (PACKAGE A)                           │
│  - Analyzes & logs to blockchain                            │
└─────────────────────────────────────────────────────────────┘
         ↓↑ Chain calls
┌─────────────────────────────────────────────────────────────┐
│     Hardhat Blockchain Node (localhost:8545)                │
│  - Stores predictions immutably (PACKAGE A contract)        │
│  - Stores trade executions (PACKAGE E contract)             │
│  - Provides transaction hashes                              │
│  - Maintains audit trail                                    │
└─────────────────────────────────────────────────────────────┘
         ↓↑ Stores data
┌─────────────────────────────────────────────────────────────┐
│              Local Databases (SQLite)                        │
│  - trade_execution_ledger.db (trades, bots, stats)         │
│  - security_alerts.db (security events)                     │
│  - prediction_verification.db (model outputs)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Daily Workflow

### Morning: Start Everything
```powershell
# Terminal 1
cd blockchain_node && npx hardhat node

# Terminal 2
cd automation\finale && python api_server.py

# Terminal 3
cd . && npm run dev

# Then open http://localhost:5173 in browser
```

### During Day: Trade & Monitor
```
- Execute trades on Trading page
- Monitor in Security Monitor page
- Start/stop bots on Trading Bots page
- Check bot performance metrics
```

### Evening: Shutdown
```
Ctrl+C in each terminal to stop
```

---

## Next Steps After Startup

Once running successfully:

1. **Try a Manual Trade**
   - Trading page → Execute buy/sell
   - Watch it appear in Security Monitor

2. **Start a Trading Bot**
   - Trading Bots page → Start Grid Bot
   - Monitor its executions in Security Monitor

3. **Check Blockc chain Logs**
   - Check Flask terminal for API calls
   - Check Hardhat terminal for transactions
   - Check databases with sqlite3

4. **Read Documentation**
   - BLOCKCHAIN_ARCHITECTURE.md - Understanding the system
   - COMPLETE_SYSTEM_GUIDE.md - Detailed reference
   - Individual module READMEs

---

## Getting Help

If something doesn't work:

1. **Check Terminal Logs**: Look for error messages
2. **Verify Ports**: Use `netstat -ano | findstr :PORT`
3. **Check Databases**: `sqlite3 *.db` and inspect tables
4. **Test APIs**: Use `curl` to test endpoints
5. **Browser Console**: Check for JavaScript errors (F12)

---

## Success Checklist

✅ Hardhat running @ http://127.0.0.1:8545  
✅ Flask running @ http://0.0.0.0:5001  
✅ React running @ http://localhost:5173  
✅ Browser shows IntelliDex homepage  
✅ Can execute trades  
✅ Trades appear in Security Monitor  
✅ Databases created successfully  

**If all checked ✅, you're ready to trade!**
