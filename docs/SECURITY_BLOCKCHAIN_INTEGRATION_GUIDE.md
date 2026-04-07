# Security Monitor & Blockchain Integration Guide

## Overview

The IntelliDex Security Monitor now integrates **Machine Learning-powered fraud detection** with **blockchain-based alert recording**. This creates an immutable audit trail of all security threats detected across your cryptocurrency transactions.

### Key Features

- **🤖 ML-Powered Fraud Detection**: Isolation Forest anomaly detection analyzes 21+ transaction features
- **⛓️ Blockchain Recording**: All alerts automatically recorded on-chain via smart contracts
- **📊 Real-Time Risk Scoring**: Component-based risk scoring (0-100 scale) with severity levels
- **💾 IPFS Storage**: Full alert details stored on distributed IPFS network
- **🔍 Wallet Profiling**: Track wallet risk scores and threat history
- **🚨 Auto-Blacklisting**: Critical threats (Score ≥ 85) auto-flag wallets

## How It Works

### Transaction Analysis Flow

```
User Input → ML Fraud Detection → Risk Scoring → Auto-Blockchain Recording → UI Display
    ↓             ↓                    ↓                ↓                      ↓
Wallet/TX    Isolation Forest    Risk Score        Smart Contract        Dashboard
              21 Features          0-100          + IPFS Storage        Alert Cards
```

### 1. Input: User Submits Transaction

Users submit either:
- **Wallet Address** (check if sender/recipient is high-risk)
- **Transaction Hash** (analyze specific on-chain transaction)

```typescript
// SecurityMonitor.tsx
const analysis = await securityMonitoringService.analyzeTransaction({
  from_address: hash,
  to_address: '',
  value_eth: 0,
  timestamp: new Date().toISOString(),
});
```

### 2. Processing: ML Fraud Detection

The **MLFraudDetector** class (fraud_detection_service.py) analyzes the transaction using:

#### Feature Extraction (21 Total Features)

##### Transaction-Level Features (7)
- **value_eth**: ETH transaction value
- **gas_price**: Gas price in Gwei
- **gas_limit**: Gas limit for transaction
- **is_contract**: Whether recipient is contract
- **token_transfers**: Number of token transfers
- **input_data_size**: Calldata size in bytes
- **is_internal**: Whether transaction is internal

##### Temporal Features (4)
- **hour**: Hour of day (0-23)
- **day_of_week**: Day number (0-6)
- **is_weekend**: Boolean flag
- **is_night**: Boolean flag (22:00-06:00)

##### Sender Behavior Features (5)
- **avg_value**: Average value of sender's transactions
- **std_value**: Standard deviation of sender's values
- **max_value**: Maximum value sender has sent
- **tx_count**: Total transactions by sender
- **value_zscore**: Value deviation from sender's average (z-score)

##### Recipient Behavior Features (3)
- **recipient_tx_count**: Total transactions received
- **unique_senders**: Count of unique senders to recipient
- **avg_received**: Average amount recipient gets

##### Blockchain Context Features (2)
- **current_block**: Current block number
- **network_gas_price**: Current network gas price

#### Risk Scoring Algorithm

The system combines **5 risk components** into a single 0-100 score:

```python
Risk Score = I + V + P + H + C

Where:
  I = Isolation Forest Anomaly Score (0-40 pts)
      • ML detects unusual transaction patterns
      • Based on statistical deviation from normal behavior
      
  V = Value Deviation Component (0-20 pts)
      • How unusual is this transaction value?
      • Compared to sender's historical average
      
  P = Known Patterns Component (0-20 pts)
      • Flash loan attack signatures
      • Delegatecall/selfdestruct calls
      • Known phishing addresses
      • Pump & dump indicators
      
  H = High Velocity Component (0-15 pts)
      • Rapid transaction frequency
      • Burst activity detection
      
  C = Contract Risk Component (0-5 pts)
      • Unverified contract interactions
      • Suspicious contract patterns
```

#### Threat Type Classification

The system classifies threats as:
- **Flash Loan Attack**: Detected delegatecalls & self-destruct calls
- **Phishing Attempt**: Known phishing addresses in sender/recipient
- **Pump & Dump Pattern**: High-velocity multi-token transactions
- **Unusual Pattern**: Anomalies detected by Isolation Forest
- **High-Risk Behavior**: Combination of behavioral anomalies
- **Known Bad Actor**: Address on threat database

### 3. Output: Risk Score & Severity

The analysis returns:

```python
{
    "risk_score": 72,                    # 0-100 numerical score
    "severity": "HIGH",                  # LOW | MEDIUM | HIGH | CRITICAL
    "threat_type": "Phishing Attempt",  # Specific threat classification
    "risk_components": {
        "isolation_forest": 25.0,        # ML anomaly score
        "value_deviation": 15.0,         # Value unusualness
        "known_patterns": 18.0,          # Signature detection
        "high_velocity": 10.0,           # Frequency analysis
        "contract_risk": 4.0             # Contract interaction risk
    },
    "evidence": [                        # Human-readable explanations
        "Sender has history of rapid transactions",
        "Value deviation from historical average: +45%",
        "Known phishing address detected in recipients"
    ],
    "recommendations": [                 # Auto-generated mitigation
        "Block transaction immediately",
        "Flag wallet 0x1234... for review",
        "Verify recipient legitimacy"
    ],
    "timestamp": "2024-01-15T14:30:00Z",
    "blockchain_logged": true,           # Auto-logged if score >= 50
    "alert_id": "ALT_8fe3c4d2...",
    "alert_hash": "0x4a2b6c8d..."
}
```

### 4. Severity Thresholds

| Severity | Score Range | Action | Color |
|----------|------------|--------|-------|
| **CRITICAL** | 85-100 | Auto-blacklist wallet | 🔴 Destructive |
| **HIGH** | 70-84 | Immediate review | 🟠 Bearish |
| **MEDIUM** | 50-69 | Monitor closely | 🟡 Warning |
| **LOW** | 0-49 | Log and track | 🟢 Success |

### 5. Blockchain Recording

If `risk_score >= 50`, the alert is **automatically** logged to the blockchain:

```solidity
// SecurityAlertRegistry.sol - On-chain recording

event AlertTriggered(
    bytes32 indexed alertHash,
    address indexed targetWallet,
    uint8 severity,
    uint256 riskScore,
    string threatType,
    string ipfsCID,
    uint256 timestamp
);

event WalletBlacklisted(
    address indexed wallet,
    uint256 riskScore,
    string reason,
    uint256 timestamp
);
```

#### What Gets Recorded On-Chain

```python
{
    "alert_hash": "0x4a2b6c8d...",           # SHA-256 of entire alert
    "timestamp": 1705331400,                  # Unix timestamp
    "wallet": "0x1234567890abcdef...",      # Analyzed wallet
    "transaction_hash": "0xabcd...",         # Related transaction (if any)
    "threat_type": "Phishing Attempt",      # Classified threat
    "risk_score": 72,                        # Numerical score
    "severity": "HIGH",                      # Severity level
    "ipfs_cid": "QmXx7...",                 # IPFS content hash
    "blockchain_tx": "0x9999...",           # Smart contract TX hash
    "resolved": false,                       # Investigation status
    "resolution_note": ""                    # Investigator notes
}
```

### 6. UI Display

The Security Monitor displays:

#### Blockchain-Recorded Alerts Card
- Recent alerts from smart contract
- Auto-refreshes every 30 seconds
- Color-coded by severity
- Shows risk score and threat type

#### High-Risk Wallets Card
- Wallets flagged by ML analysis
- Risk score display
- Threat count history
- Auto-updated as new alerts are recorded

#### Analysis Result Card
Shows detailed breakdown when user analyzes a transaction:
- **Risk Score** with color gradient
- **Severity Badge** (CRITICAL/HIGH/MEDIUM/LOW)
- **Threat Type** classification
- **Risk Components** with contribution breakdown
- **Evidence** list with supporting details
- **Recommendations** for mitigation
- **Blockchain Info** if recorded on-chain

## API Reference

### POST /api/security/analyze-transaction

Analyze a transaction for fraud risk using ML.

**Request:**
```json
{
  "from_address": "0x1234...",
  "to_address": "0x5678...",
  "value_eth": 5.0,
  "timestamp": "2024-01-15T14:30:00Z",
  "wallet_history": [...],           // Optional: historical transactions
  "blockchain_context": {...}        // Optional: network data
}
```

**Response:**
```json
{
  "risk_score": 72,
  "severity": "HIGH",
  "threat_type": "Phishing Attempt",
  "risk_components": {...},
  "evidence": [...],
  "recommendations": [...],
  "blockchain_logged": true,
  "alert_id": "ALT_8fe3c4d2",
  "alert_hash": "0x4a2b6c8d"
}
```

**Side Effects:**
- If `risk_score >= 50`, automatically logs to blockchain
- Updates wallet risk profile database
- If `score >= 85`, adds wallet to smart contract blacklist

---

### POST /api/security/log-alert

Manually record a security alert to blockchain.

**Request:**
```json
{
  "wallet_address": "0x1234...",
  "transaction_hash": "0xabcd...",    // Optional
  "risk_score": 75,
  "severity": "HIGH",
  "threat_type": "Pump & Dump Pattern",
  "threat_details": "Detected 15 rapid token transfers",
  "evidence": [...],                   // Optional
  "recommendations": [...]             // Optional
}
```

**Response:**
```json
{
  "alert_id": "ALT_8fe3c4d2",
  "alert_hash": "0x4a2b6c8d",
  "timestamp": "2024-01-15T14:30:00Z",
  "message": "Alert recorded on blockchain"
}
```

---

### GET /api/security/alerts/{wallet_address}

Get all alerts for a specific wallet.

**Query Parameters:**
- None

**Response:**
```json
{
  "wallet": "0x1234...",
  "alerts": [
    {
      "id": 1,
      "alert_hash": "0x4a2b...",
      "timestamp": "2024-01-15T14:30:00Z",
      "severity": "HIGH",
      "risk_score": 72,
      "threat_type": "Phishing Attempt",
      "blockchain_tx": "0x9999...",
      "ipfs_cid": "QmXx7...",
      "recorded_on_chain": true
    }
  ],
  "alert_count": 5
}
```

---

### GET /api/security/high-risk-wallets

List wallets flagged as high-risk by ML.

**Query Parameters:**
- `min_score`: Minimum risk score threshold (default: 70)

**Response:**
```json
{
  "high_risk_wallets": [
    {
      "wallet_address": "0x1234...",
      "risk_score": 82,
      "threat_count": 5,
      "last_threat_timestamp": "2024-01-15T14:30:00Z",
      "blacklist_status": true
    }
  ],
  "wallet_count": 3,
  "threshold": 70
}
```

---

### GET /api/security/recent-alerts

Get recent blockchain-recorded alerts.

**Query Parameters:**
- `limit`: Number of alerts to return (default: 10)

**Response:**
```json
{
  "recent_alerts": [
    {
      "id": 156,
      "alert_hash": "0x4a2b...",
      "timestamp": "2024-01-15T14:30:00Z",
      "transaction_hash": "0xabcd...",
      "wallet_address": "0x1234...",
      "severity": "CRITICAL",
      "risk_score": 92,
      "threat_type": "Flash Loan Attack",
      "blockchain_tx": "0x9999...",
      "ipfs_cid": "QmXx7...",
      "recorded_on_chain": true
    }
  ],
  "alert_count": 5
}
```

## Smart Contract Reference

### SecurityAlertRegistry.sol

Location: `blockchain/contracts/SecurityAlertRegistry.sol`

#### Key Functions

```solidity
// Record a new security alert
function recordAlert(
    bytes32 alertHash,
    address targetWallet,
    bytes32 transactionHash,
    string memory threatType,
    uint8 riskScore,
    Severity severity,
    string memory ipfsCID
) public returns (uint256)

// Record transaction-specific alert
function recordTransactionAlert(
    address targetWallet,
    bytes32 transactionHash,
    uint8 riskScore,
    Severity severity,
    string memory threatType
) public returns (uint256)

// Add ML-detected threat pattern to registry
function addThreatPattern(
    string memory patternName,
    string memory description,
    uint8 confidenceScore
) public

// Update wallet risk profile
function updateWalletRiskScore(
    address wallet,
    uint8 newScore
) public

// Blacklist high-risk wallet
function blacklistWallet(
    address wallet,
    string memory reason
) public

// Remove wallet from blacklist
function removeFromBlacklist(address wallet) public

// Mark alert as investigated and resolved
function resolveAlert(
    uint256 alertId,
    string memory resolutionNote
) public

// Query functions
function getAlert(uint256 alertId) public view returns (SecurityAlert memory)
function getWalletProfile(address wallet) public view returns (WalletRiskProfile memory)
function getWalletAlerts(address wallet) public view returns (uint256[] memory)
function isBlacklisted(address wallet) public view returns (bool)
```

#### Events

```solidity
event AlertTriggered(
    bytes32 indexed alertHash,
    address indexed targetWallet,
    uint8 severity,
    uint256 riskScore,
    string threatType,
    string ipfsCID,
    uint256 timestamp
);

event AlertResolved(
    uint256 indexed alertId,
    string resolutionNote,
    uint256 timestamp
);

event WalletBlacklisted(
    address indexed wallet,
    uint256 riskScore,
    string reason,
    uint256 timestamp
);

event WalletRemoved(
    address indexed wallet,
    uint256 timestamp
);

event RiskScoreUpdated(
    address indexed wallet,
    uint8 oldScore,
    uint8 newScore,
    uint256 timestamp
);
```

## Database Schema

### security_alerts

```sql
CREATE TABLE security_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_hash TEXT UNIQUE,                -- SHA-256 hash of alert
    timestamp TEXT,                        -- ISO 8601 timestamp
    wallet_address TEXT,                   -- Analyzed wallet
    transaction_hash TEXT,                 -- Related transaction
    severity TEXT,                         -- LOW|MEDIUM|HIGH|CRITICAL
    risk_score REAL,                       -- 0-100 score
    threat_type TEXT,                      -- Type of threat
    ipfs_cid TEXT,                         -- IPFS storage hash
    blockchain_tx TEXT,                    -- Smart contract TX hash
    recorded_on_chain BOOLEAN DEFAULT 0    -- Blockchain status
);
```

### wallet_risk_profiles

```sql
CREATE TABLE wallet_risk_profiles (
    wallet_address TEXT PRIMARY KEY,
    risk_score REAL DEFAULT 0,             -- Current risk (0-100)
    threat_count INTEGER DEFAULT 0,        -- Total threats detected
    blacklist_status BOOLEAN DEFAULT 0,    -- Is blacklisted?
    last_alert_timestamp TEXT              -- Last threat timestamp
);
```

### threat_patterns

```sql
CREATE TABLE threat_patterns (
    pattern_name TEXT PRIMARY KEY,
    description TEXT,
    confidence_score REAL,                 -- Detection confidence (0-1)
    last_detected TEXT                     -- Most recent detection
);
```

## Troubleshooting

### Alert Not Recording to Blockchain

**Symptoms:** `blockchain_logged: false` in analysis result

**Causes:**
1. Risk score < 50 (must be ≥ 50 to auto-log)
2. Smart contract not deployed (`SecurityAlertRegistry.sol`)
3. Network connection issue to Hardhat node

**Solution:**
```bash
# Check if smart contract is deployed
cd blockchain_node
npm run deploy

# Verify Hardhat node is running
npx hardhat node
```

### High Risk Scores on Low-Risk Transactions

**Solution:**
The ML model needs historical transaction data to calibrate. Provide wallet history:

```typescript
const analysis = await securityMonitoringService.analyzeTransaction({
  from_address: walletAddr,
  to_address: '',
  value_eth: 0,
  timestamp: new Date().toISOString(),
  wallet_history: [                    // Add historical transactions
    {
      value_eth: 1.5,
      timestamp: "2024-01-14T10:00:00Z"
    },
    {
      value_eth: 2.0,
      timestamp: "2024-01-14T11:00:00Z"
    }
  ]
});
```

### IPFS Upload Failing

**Symptoms:** `ipfs_cid: null` in blockchain record

**Solution:**
1. Check Pinata API keys in `keys.txt`
2. Verify IPFS node connectivity
3. Check network rate limits

```bash
# In api_server.py, rerun IPFS upload manually
curl -X POST http://localhost:5001/api/security/log-alert \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x...", "risk_score": 75, ...}'
```

## Performance Metrics

- **Analysis Time**: ~200ms per transaction (ML inference)
- **Blockchain Recording**: ~2 seconds (smart contract + IPFS)
- **Total Flow**: ~2.2 seconds from input to UI display
- **ML Model**: Isolation Forest (100 estimators, 5% contamination)
- **Feature Extraction**: 21 features in ~50ms

## Next Steps

1. **Set Risk Thresholds**: Adjust severity levels based on your needs
2. **Whitelist Known Wallets**: Reduce false positives
3. **Monitor Patterns**: Regularly review detected threat patterns
4. **Integrate Alerts**: Connect to email/Slack for critical alerts
5. **Daily Reports**: Generate summary of detected threats

## Support

For issues or feature requests:
1. Check logs in `automation/finale/fraud_detection_service.py`
2. Review smart contract events in Hardhat
3. Examine IPFS pin status at Pinata dashboard
