# Blockchain Prediction Auto-Update System

## Overview

The IntelliDex system now supports automatic prediction generation and blockchain logging every 15 minutes (or custom interval). This ensures that all predictions are immutably recorded on-chain with IPFS backup and cryptographic verification.

## Features

### 🔄 Automatic Prediction Updates
- **Configurable Interval**: Update predictions every 5-120 minutes (default: 15 minutes)
- **Real-time Verification**: Predictions are automatically verified against actual prices
- **Manual Override**: Click "Update Now" to instantly generate new predictions anytime
- **Countdown Timer**: Visual countdown to the next automatic update

### 🔗 Blockchain Integration
- **Automatic Logging**: Each set of predictions is logged to the blockchain network
- **IPFS Backup**: Prediction data is stored on IPFS with cryptographic hashing
- **Transaction Verification**: Every update generates a blockchain transaction hash
- **On-chain Proof**: SHA-256 hashes, IPFS CIDs, and transaction hashes are recorded

### 📊 Live Updates on Both Pages
- **Predictions Page**: See real-time countdown and manual update controls
- **Blockchain Verification Page**: Watch blockchain logs update as new predictions are recorded
- **Prediction History**: Verified predictions populate the history table automatically

## How to Use

### Enable Auto-Updates

1. Navigate to the **Predictions** page
2. Click the **Settings** button in the Blockchain Controls section
3. Toggle **Enable Auto-Updates** to ON
4. Choose your preferred update interval (default: 15 minutes)
5. Toggle **Log to Blockchain** to automatically record on-chain
6. Click **Save Settings**

### Manual Prediction Submission

1. On the **Predictions** page, click the **Update Now** button
2. The system will immediately:
   - Generate new ML predictions
   - Update the predictions table
   - Log to blockchain (if enabled)
   - Display the countdown timer
3. You'll see a confirmation toast notification

### Monitor Blockchain Verifications

1. Go to the **Blockchain Verification** page
2. View the latest blockchain logs showing:
   - **Timestamp**: When the prediction was logged
   - **BTC Price**: The current price at prediction time
   - **SHA-256 Hash**: Cryptographic hash of the prediction
   - **IPFS CID**: Content identifier for distributed storage
   - **Transaction Hash**: On-chain blockchain transaction reference

3. Use the **Live/Paused** toggle to enable/disable auto-refresh (every 10 seconds)
4. Click the refresh icon for manual updates

## System Architecture

### Frontend Components

```
Predictions.tsx
├── useAutoPredictionUpdates hook
│   ├── Starts 15-minute interval on component mount
│   ├── Calls /api/predictions/log-blockchain on timer
│   ├── Updates store with new predictions
│   └── Shows toast notifications
├── PredictionAutoUpdateSettings modal
│   ├── Configures update interval
│   ├── Toggles auto-update on/off
│   └── Toggles blockchain logging
└── BlockchainVerification component
    ├── Polls blockchain logs every 10 seconds
    ├── Shows latest 3 blockchain verifications
    └── Live/Paused toggle for auto-refresh
```

### Backend Endpoints

#### `GET /api/predictions`
Returns 7-horizon ML predictions.

```json
{
  "success": true,
  "predictions": [
    {
      "id": "ML-1234567890-15",
      "timestamp": "2024-01-15T10:30:00Z",
      "horizon": "15 minutes",
      "predictedPrice": 52680.50,
      "confidence": 85,
      "direction": "up"
    }
  ]
}
```

#### `POST /api/predictions/log-blockchain` (NEW)
Logs current predictions to blockchain with IPFS storage.

**Request Body:**
```json
{
  "predictions": [...],
  "currentPrice": 52650,
  "timestamp": "2024-01-15T10:30:00Z",
  "sentimentScore": 0.35
}
```

**Response:**
```json
{
  "success": true,
  "prediction_id": "pred_12345",
  "prediction_hash": "abc123def456...",
  "ipfs_cid": "QmX7y8z9A0B1C2D3E4F5...",
  "blockchain_tx": "0x7a8f...3b2c",
  "message": "Predictions successfully logged to blockchain network"
}
```

#### `GET /api/blockchain/logs`
Retrieves the latest blockchain verification logs.

```json
{
  "success": true,
  "logs": [
    {
      "hash": "abc123def456...",
      "timestamp": "2024-01-15T10:30:00Z",
      "price": 52650,
      "ipfs_cid": "QmX7y8z9A0B1C2D3E4F5...",
      "tx_hash": "0x7a8f...3b2c"
    }
  ]
}
```

## Store State

The Zustand store includes new fields for auto-update configuration:

```typescript
// Auto-update settings
autoUpdateEnabled: boolean;          // Enable/disable auto-updates
autoUpdateInterval: number;          // Minutes between updates (5-120)
autoLogToBlockchain: boolean;        // Auto-log to blockchain
lastBlockchainUpdate: string | null; // ISO timestamp of last update

// Actions
setAutoUpdateEnabled: (enabled: boolean) => void;
setAutoUpdateInterval: (minutes: number) => void;
setAutoLogToBlockchain: (enabled: boolean) => void;
setLastBlockchainUpdate: (timestamp: string | null) => void;
```

## Configuration

### Default Settings
- Auto-Update Enabled: **true**
- Update Interval: **15 minutes**
- Blockchain Logging: **true**

### Customization
Users can customize these via the Settings modal at any time. Settings are managed through the Zustand store.

## Technical Details

### useAutoPredictionUpdates Hook

Located in `src/hooks/useAutoPredictionUpdates.ts`

```typescript
interface AutoUpdateConfig {
  enabled: boolean;
  intervalMinutes: number;
  autoLogToBlockchain: boolean;
}

function useAutoPredictionUpdates(config: AutoUpdateConfig) {
  // Returns { updatePredictions: () => Promise<void>, isUpdating: boolean }
}
```

### Blockchain Logging Flow

1. **Timer Triggers** → Every N minutes
2. **Generate Predictions** → Call ML model endpoint
3. **Prepare Data** → Format for blockchain
4. **Log to Database** → SQLite prediction_verification.db
5. **Upload to IPFS** → Store full prediction data
6. **Record on-chain** → Hardhat smart contract
7. **Update UI** → Refresh blockchain logs component

## Troubleshooting

### Auto-updates not working?
- Check that Flask API server is running on port 5001
- Verify `/api/predictions` endpoint is accessible
- Check browser console for errors
- Ensure ML model files exist in `automation/finale/`

### Blockchain logs not showing?
- Verify Hardhat network is running
- Check that blockchain integration packages are properly configured
- Look for errors in Flask server logs
- Ensure IPFS connectivity (pinata.cloud or local node)

### Predictions not updating?
- Confirm ML model health: Check "Transformer Model" badge on Predictions page
- Verify data freshness: Check "data Xh ago" indicator
- Try manual "Update Now" button to test connectivity
- Check prediction history for recent entries

## Performance Considerations

- **Polling Interval**: Blockchain logs checked every 10 seconds
- **Prediction Cache**: 5-minute cache to avoid redundant ML computations
- **Database**: SQLite for local caching, indexed by prediction_id
- **Network**: Async operations prevent UI blocking

## Future Enhancements

- [ ] Customizable notification sounds for new predictions
- [ ] Prediction performance analytics dashboard
- [ ] Export blockchain logs to CSV
- [ ] Multi-symbol auto-update scheduling
- [ ] Webhook integration for external systems
- [ ] Real-time WebSocket updates for blockchain logs

## Support

For issues or questions:
1. Check the [AUTOMATION_GUIDE.txt](../automation/finale/AUTOMATION_GUIDE.txt)
2. Review Flask server logs in `automation/finale/flask.log`
3. Check browser console for JavaScript errors
4. Verify all required services are running (ML API, Hardhat, IPFS)
