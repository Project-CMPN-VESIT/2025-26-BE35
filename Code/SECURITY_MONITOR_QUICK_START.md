# 🚀 Security Monitor Quick Start

## 60-Second Setup

### 1. Start Required Services
```bash
# Terminal 1: Hardhat Node
cd blockchain_node
npx hardhat node

# Terminal 2: Flask API
cd automation/finale
python api_server.py

# Terminal 3: React Dev Server
npm run dev
```

### 2. Open Security Monitor
- Navigate to: http://localhost:5173
- Click "Security Monitor" in navigation menu

### 3. Test It Out
```
Input: Wallet address (e.g., 0x1234567890123456789012345678901234567890)
Click: "Analyze"
Expected: Risk score (0-100) + Severity badge
```

---

## Key Features at a Glance

| Feature | Purpose | How to Use |
|---------|---------|-----------|
| **ML Risk Score** | Detect fraud using AI | Input wallet → See 0-100 score |
| **Risk Components** | Understand which factors contribute to score | View breakdown in analysis card |
| **Blockchain Recording** | Immutable alert history | Score ≥ 50 auto-logs to blockchain |
| **High-Risk Wallets** | Track flagged addresses | See list below analysis |
| **Evidence** | Understand the threat | Read "Evidence" section |
| **Recommendations** | Know what to do | Follow auto-generated actions |

---

## Risk Level Meanings

- 🟢 **LOW** (0-49): Safe to proceed
- 🟡 **MEDIUM** (50-69): Monitor closely
- 🟠 **HIGH** (70-84): Immediate review needed
- 🔴 **CRITICAL** (85-100): Block + Auto-blacklist on blockchain

---

## What Gets Recorded on Blockchain?

**When score ≥ 50:**
- ✅ Risk score (0-100)
- ✅ Severity level (LOW/MEDIUM/HIGH/CRITICAL)
- ✅ Threat type (Phishing, Flash Loan, etc.)
- ✅ Evidence summary
- ✅ SHA-256 hash (cryptographic proof)
- ✅ IPFS CID (distributed storage)
- ✅ Smart contract TX hash
- ✅ Wallet risk profile update

---

## ML Detection - What It Analyzes

```
21 Features Analyzed:
├─ Transaction Level (7): value, gas, contract type, token transfers, data size
├─ Temporal (4): hour, day, weekend status, night flag
├─ Sender Behavior (5): avg/max/std value, tx count, deviation score
├─ Recipient Behavior (3): tx count, unique senders, avg received
└─ Blockchain Context (2): block number, network gas price
```

---

## API Quick Reference

```bash
# Analyze transaction
POST /api/security/analyze-transaction
  Input: { from_address, to_address, value_eth, timestamp }
  Output: { risk_score, severity, threat_type, blockchain_logged, ... }

# Get recent blockchain alerts
GET /api/security/recent-alerts?limit=5
  Output: { recent_alerts: [...], alert_count }

# Get high-risk wallets
GET /api/security/high-risk-wallets?min_score=70
  Output: { high_risk_wallets: [...], wallet_count }

# Get wallet alert history
GET /api/security/alerts/{wallet_address}
  Output: { wallet, alerts: [...], alert_count }

# Log alert manually
POST /api/security/log-alert
  Input: { wallet_address, risk_score, severity, threat_type, ... }
  Output: { alert_id, alert_hash, message }
```

---

## Threat Types Explained

| Threat | Example | Risk |
|--------|---------|------|
| **Flash Loan Attack** | Smart contract calls + delegatecall | 🔴 CRITICAL |
| **Phishing Attempt** | Known scam address detected | 🟠 HIGH |
| **Pump & Dump Pattern** | Rapid token transfers (10+) | 🟠 HIGH |
| **Unusual Pattern** | Statistical anomaly detected | 🟡 MEDIUM |
| **High Velocity** | Too many txs in short time | 🟡 MEDIUM |
| **Contract Risk** | Unverified smart contract interaction | 🟡 MEDIUM |

---

## Common Tasks

### Task 1: Check if a Wallet is Safe
```
1. Go to Security Monitor
2. Enter wallet address
3. Click "Analyze"
4. Read risk score (green = safe, red = dangerous)
5. If HIGH/CRITICAL: See recommendations
```

### Task 2: View All Recent Alerts
```
1. Look at "Blockchain-Recorded Alerts" card
2. See up to 5 most recent threats
3. Click refresh button to update manually
4. Colors show severity level
```

### Task 3: Find High-Risk Wallets
```
1. Look at "High-Risk Wallets" card
2. Shows all wallets with score ≥ 70
3. Sorted by risk (highest first)
4. Hover for additional details
```

### Task 4: Understand Why Score is High
```
1. View "Risk Components" breakdown
2. See which factors contributed:
   - Isolation Forest (ML anomaly): 0-40 pts
   - Value Deviation (unusual amount): 0-20 pts
   - Known Patterns (phishing, flash): 0-20 pts
   - High Velocity (too fast): 0-15 pts
   - Contract Risk (unsafe interaction): 0-5 pts
3. Read "Evidence" for specific details
```

---

## Troubleshooting

### Issue: Analysis takes > 5 seconds
**Cause**: Hardhat network latency or first ML model load
**Solution**: Wait or restart services

### Issue: Alerts not appearing on blockchain
**Cause**: Score < 50 (must be ≥ 50 to auto-log)
**Solution**: Analyze higher-risk transaction

### Issue: "API connection refused" error
**Cause**: Flask server not running
**Solution**: 
```bash
cd automation/finale
python api_server.py
```

### Issue: "Hardhat connection failed"
**Cause**: Hardhat node not running
**Solution**:
```bash
cd blockchain_node
npx hardhat node
```

---

## Next Steps

📚 **Learn More:**
- Full guide: `docs/SECURITY_BLOCKCHAIN_INTEGRATION_GUIDE.md`
- Testing: `docs/SECURITY_TESTING_GUIDE.md`
- Completion summary: `SECURITY_BLOCKCHAIN_COMPLETION_SUMMARY.md`

🧪 **Test the System:**
1. Follow test cases in SECURITY_TESTING_GUIDE.md
2. Validate each component works
3. Check blockchain recording
4. Verify IPFS storage

⚙️ **Customize for Your Needs:**
1. Adjust risk thresholds if needed
2. Update threat pattern database
3. Add custom wallet whitelist
4. Configure notifications

---

## Performance Expected

| Operation | Time |
|-----------|------|
| ML Analysis | ~200ms |
| Blockchain Recording | ~2s |
| Alert UI Display | ~500ms |
| **Total Flow** | ~2.5s |

---

## Architecture Overview

```
User Input (Wallet/TX)
        ↓
   ML Analysis
   ├─ Feature extraction (21)
   ├─ Isolation Forest
   └─ Risk scoring
        ↓
  Risk Score (0-100)
  Severity Badge
  Threat Type
        ↓
  [If score ≥ 50]
  Auto-Log to Blockchain
        ↓
  Smart Contract Recording
  + IPFS Storage
  + Wallet Profiling
        ↓
  UI Display Updates
  Real-Time Alerts
```

---

## Status Check Commands

```bash
# Check Flask API
curl http://localhost:5001/api/health

# Check Hardhat Node
curl http://localhost:8545

# Check React Dev Server
curl http://localhost:5173
```

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/pages/SecurityMonitor.tsx` | Main UI component |
| `src/services/securityMonitoringService.ts` | Frontend-backend bridge |
| `automation/finale/fraud_detection_service.py` | ML analysis engine |
| `blockchain/PACKAGE_D_security_alerts.py` | Blockchain logger |
| `blockchain/contracts/SecurityAlertRegistry.sol` | Smart contract |
| `automation/finale/api_server.py` | Backend API |

---

## Quick Tips

💡 **Tip 1**: Score < 50 = Not logged to blockchain (normal tx)
💡 **Tip 2**: Score ≥ 85 = Auto-blacklists wallet on blockchain
💡 **Tip 3**: Check "Evidence" section to understand the threat
💡 **Tip 4**: Use "Recommendations" to know what action to take
💡 **Tip 5**: Blockchain alerts refresh every 30 seconds automatically

---

## Need Help?

1. **Check Documentation**: `docs/SECURITY_BLOCKCHAIN_INTEGRATION_GUIDE.md`
2. **Run Tests**: Follow `docs/SECURITY_TESTING_GUIDE.md`
3. **Review Examples**: API examples in documentation
4. **Check Logs**: Flask logs in `automation/finale/`

---

**✅ Ready to use! Start with Step 1: Start Required Services above.**
