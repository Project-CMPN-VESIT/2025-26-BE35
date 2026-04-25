# Security Monitor Testing Guide

## Quick Start - Test the Integrated System

This guide walks you through testing the ML fraud detection + blockchain recording system end-to-end.

## Prerequisites

✅ Hardhat node running:
```bash
cd blockchain_node
npx hardhat node
```

✅ Flask API server running (port 5001):
```bash
cd automation/finale
python api_server.py
```

✅ React dev server running (port 5173):
```bash
npm run dev
```

## Test Case 1: Low-Risk Transaction (Normal Behavior)

**Expected Result**: Risk Score < 50, no blockchain logging

### Step 1: Navigate to Security Monitor
- Open http://localhost:5173
- Click "Security Monitor" in navigation

### Step 2: Analyze Normal Transaction
- Enter a normal wallet address in "Wallet/Account Address" field
- Example: `0x1234567890123456789012345678901234567890`
- Click "Analyze"

### Step 3: Verify Results
```javascript
// Expected response structure:
{
  "risk_score": 15,              // Low score
  "severity": "LOW",
  "threat_type": "Normal Pattern",
  "blockchain_logged": false,    // NOT logged (score < 50)
  "risk_components": {
    "isolation_forest": 5.0,
    "value_deviation": 2.0,
    "known_patterns": 0.0,
    "high_velocity": 0.0,
    "contract_risk": 8.0
  },
  "evidence": [
    "No significant anomalies detected",
    "Transaction value within normal range"
  ],
  "recommendations": [
    "Transaction appears safe to proceed"
  ]
}
```

### Step 4: Check Blockchain Card
- Look at "Blockchain-Recorded Alerts" card
- Should NOT show this alert (score < 50)
- Only critical alerts (≥50) are recorded

---

## Test Case 2: Medium-Risk Transaction (Suspicious)

**Expected Result**: Risk Score 50-70, auto-logged to blockchain

### Step 1: Submit Medium-Risk Analysis
- Enter a wallet address
- Click "Analyze"

### Step 2: Verify Risk Score
```javascript
// Expected: 50-70 range
{
  "risk_score": 62,
  "severity": "MEDIUM",
  "threat_type": "Unusual Pattern",
  "blockchain_logged": true,     // AUTO-LOGGED!
  "alert_id": "ALT_8fe3c4d2",
  "alert_hash": "0x4a2b6c8d..."
}
```

### Step 3: Verify Blockchain Recording
- Check "Blockchain-Recorded Alerts" card
- Alert should appear within 30 seconds
- Severity badge shows "MEDIUM" in yellow
- Risk score displayed: 62/100

### Step 4: Check Wallet Profile
- Look at "High-Risk Wallets" card
- Wallet should now appear if score > 70
- Shows threat count and risk score

---

## Test Case 3: High-Risk Transaction (Phishing)

**Expected Result**: Risk Score 70-84, blockchain recording with notifications

### Step 1: Analyze High-Risk Transaction
- Enter test wallet address
- Click "Analyze"

### Step 2: Verify Critical Indicators
```javascript
{
  "risk_score": 78,
  "severity": "HIGH",            // High severity
  "threat_type": "Phishing Attempt",
  "blockchain_logged": true,
  "risk_components": {
    "isolation_forest": 30.0,    // High ML anomaly
    "known_patterns": 18.0,      // Phishing detected
    "value_deviation": 15.0,
    "high_velocity": 10.0,
    "contract_risk": 5.0
  },
  "evidence": [
    "Known phishing address detected in recipients",
    "Unusual sender behavior pattern",
    "Value deviation from historical average: +55%"
  ],
  "recommendations": [
    "Block transaction immediately",
    "Flag wallet for investigation",
    "Report to security team"
  ]
}
```

### Step 3: Verify Blockchain Recording
- Toast notification: "Analysis complete - Risk Score: 78"
- Card updates with blockchain info:
  - Alert ID: `ALT_8fe3c4d2`
  - Hash: `0x4a2b...` (truncated)
- Blockchain status: "✓ Recorded on blockchain"

### Step 4: Check Blockchain Cards
- **Blockchain-Recorded Alerts**: Shows alert with ORANGE badge
- **High-Risk Wallets**: Wallet appears in list (if ≥ 70)
- Risk Distribution updates to include new HIGH severity alert

---

## Test Case 4: Critical Risk Transaction (Flash Loan Attack)

**Expected Result**: Risk Score ≥ 85, auto-blacklist wallet on blockchain

### Step 1: Submit Critical Analysis
- Click "Analyze" with test wallet

### Step 2: Verify CRITICAL Response
```javascript
{
  "risk_score": 92,
  "severity": "CRITICAL",        // CRITICAL level
  "threat_type": "Flash Loan Attack",
  "blockchain_logged": true,
  "alert_id": "ALT_critical_1",
  "alert_hash": "0x9999...",
  "risk_components": {
    "isolation_forest": 40.0,    // MAXIMUM
    "known_patterns": 20.0,      // Flash loan signature
    "value_deviation": 20.0,
    "high_velocity": 10.0,
    "contract_risk": 2.0
  },
  "evidence": [
    "Flash loan attack pattern detected",
    "Delegatecall to suspicious contract",
    "Rapid high-value token transfers",
    "Sender profile: Known attacker address"
  ],
  "recommendations": [
    "BLOCK TRANSACTION IMMEDIATELY",
    "Blacklist wallet on blockchain",
    "Alert security operations team",
    "Review all transactions from this wallet"
  ]
}
```

### Step 3: Verify Wallet Auto-Blacklist
- Smart contract automatically blacklists if score ≥ 85
- Check blockchain event log:
  ```
  event WalletBlacklisted(
    address indexed wallet,
    uint256 riskScore,
    string reason,
    uint256 timestamp
  );
  ```

### Step 4: Verify UI Updates
- Risk Distribution pie chart: RED section appears
- Blockchain-Recorded Alerts: RED badge for CRITICAL
- High-Risk Wallets: Wallet at top of list (92/100)
- Toast shows error severity level in UI

---

## Test Case 5: Load Blockchain Alerts History

**Expected Result**: All historical alerts displayed in real-time

### Step 1: Click Live Refresh Button
- In "Blockchain-Recorded Alerts" card
- Click refresh icon button

### Step 2: Verify Alert Loading
- Should show up to 5 most recent alerts
- Each alert displays:
  - Severity badge (color-coded)
  - Threat type label
  - Risk score (0-100)
  - Timestamp in local time

### Step 3: Verify High-Risk Wallets
- In "High-Risk Wallets" card
- Shows all wallets with score ≥ 70
- Displays threat count and risk score
- Sorted by risk score (highest first)

---

## Test Case 6: Multiple Rapid Analyses (High Velocity)

**Expected Result**: Velocity pattern detected, high-velocity component increases

### Step 1: Submit 5 Analyses Consecutively
- Analyze same wallet 5 times in rapid succession
- Click "Analyze" button repeatedly (wait ~2s between each)

### Step 2: Verify High-Velocity Detection
- Each subsequent analysis increases `high_velocity` score
- Example progression:
  ```
  1st: high_velocity = 0.0
  2nd: high_velocity = 3.0
  3rd: high_velocity = 6.0
  4th: high_velocity = 10.0
  5th: high_velocity = 15.0 (maximum)
  ```

### Step 3: Check Total Risk Score
- Total score should increase due to velocity component
- Final risk score = base + (high_velocity * factor)

---

## API Testing (Command Line)

### Test Analyze Transaction Endpoint

```bash
# Analyze a transaction
curl -X POST http://localhost:5001/api/security/analyze-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from_address": "0x1234567890123456789012345678901234567890",
    "to_address": "0x0987654321098765432109876543210987654321",
    "value_eth": 10.5,
    "timestamp": "2024-01-15T14:30:00Z"
  }'

# Response (example):
# {
#   "risk_score": 62,
#   "severity": "MEDIUM",
#   "threat_type": "Unusual Pattern",
#   "blockchain_logged": true,
#   "alert_id": "ALT_8fe3c4d2",
#   ...
# }
```

### Test Get Recent Alerts

```bash
# Get 5 most recent alerts
curl http://localhost:5001/api/security/recent-alerts?limit=5

# Response:
# {
#   "recent_alerts": [
#     {
#       "id": 156,
#       "alert_hash": "0x4a2b...",
#       "severity": "HIGH",
#       "risk_score": 78,
#       ...
#     }
#   ],
#   "alert_count": 5
# }
```

### Test Get High-Risk Wallets

```bash
# Get wallets with score >= 70
curl "http://localhost:5001/api/security/high-risk-wallets?min_score=70"

# Response:
# {
#   "high_risk_wallets": [
#     {
#       "wallet_address": "0x1234...",
#       "risk_score": 82,
#       "threat_count": 5,
#       ...
#     }
#   ],
#   "wallet_count": 3
# }
```

### Test Manual Alert Logging

```bash
# Log alert manually
curl -X POST http://localhost:5001/api/security/log-alert \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x1234567890123456789012345678901234567890",
    "risk_score": 75,
    "severity": "HIGH",
    "threat_type": "Pump & Dump Pattern",
    "threat_details": "Detected 10+ rapid token transfers"
  }'

# Response:
# {
#   "alert_id": "ALT_manual_1",
#   "alert_hash": "0x4a2b...",
#   "timestamp": "2024-01-15T14:30:00Z",
#   "message": "Alert recorded on blockchain"
# }
```

---

## Validation Checklist

### Frontend UI ✅
- [ ] Security Monitor page loads
- [ ] Wallet/Address input accepts input
- [ ] Analysis button triggers ML analysis
- [ ] Risk score displays with correct color gradient
- [ ] Severity badge shows correct level
- [ ] Risk components breakdown displayed
- [ ] Evidence list shown
- [ ] Recommendations displayed
- [ ] Blockchain info card visible (if logged)
- [ ] Blockchain-Recorded Alerts card updates
- [ ] High-Risk Wallets card displays data
- [ ] Live refresh button works

### Backend API ✅
- [ ] `/api/security/analyze-transaction` returns correct structure
- [ ] Risk score calculated (0-100 range)
- [ ] Severity assigned correctly
- [ ] Risk components sum correctly
- [ ] `blockchain_logged: true` if score >= 50
- [ ] `blockchain_logged: false` if score < 50
- [ ] `/api/security/recent-alerts` returns recent records
- [ ] `/api/security/high-risk-wallets` filters by min_score
- [ ] `/api/security/alerts/{address}` returns wallet history
- [ ] `/api/security/log-alert` creates manual alerts

### Blockchain ✅
- [ ] Alert committed to smart contract
- [ ] Alert hash matches database
- [ ] Event `AlertTriggered` emitted
- [ ] IPFS CID stored in contract
- [ ] Wallet risk profile updated
- [ ] Auto-blacklist triggers for score >= 85
- [ ] Event `WalletBlacklisted` emitted (critical alerts)

### Database ✅
- [ ] Alert record created in `security_alerts` table
- [ ] Wallet profile updated in `wallet_risk_profiles`
- [ ] Hash recorded and verifiable
- [ ] Timestamp accurate
- [ ] All fields populated correctly

---

## Performance Benchmarks

| Operation | Target Time | Test Result |
|-----------|------------|------------|
| ML Analysis | < 300ms | ✅ |
| Blockchain Recording | < 3s | ✅ |
| Alert API Response | < 100ms | ✅ |
| UI Update | < 500ms | ✅ |
| Total Flow (input → display) | < 4s | ✅ |

---

## Troubleshooting During Testing

### Test Fails: "API connection refused"
```bash
# Check if Flask server is running
curl http://localhost:5001/api/health

# If not running, start it:
cd automation/finale
python api_server.py
```

### Test Fails: "blockchain_logged: false" when score > 50
```bash
# Check if Hardhat node is running
curl http://localhost:8545

# Check if contract is deployed
cat blockchain/hardhat_deployed_contracts.json

# If not deployed:
cd blockchain_node
npx hardhat run scripts/deploy.js --network localhost
```

### Test Fails: "IPFS upload error"
```bash
# Check Pinata keys
cat automation/finale/keys.txt | grep pinata

# Try local IPFS node instead:
# In api_server.py, set: use_local_node=True
```

### Test Takes Too Long (>5s)
- Network latency - acceptable for blockchain operations
- ML model loading - first run takes longer
- Verify Hardhat performance: `npx hardhat test`

---

## Next Test Suite Steps

1. **Stress Test**: Submit 10+ analyses in quick succession
2. **False Positive Test**: Normal transactions shouldn't score > 50
3. **False Negative Test**: Known phishing should score > 70
4. **Persistence Test**: Restart servers, verify alerts still there
5. **Cold Start Test**: First analysis takes longer due to ML init
