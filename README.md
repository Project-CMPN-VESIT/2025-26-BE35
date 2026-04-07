# IntelliDex Trader

A comprehensive cryptocurrency trading platform with AI-powered predictions, blockchain security, and automated trading bots. Built with React, Python ML, and Ethereum smart contracts.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Git
- Windows/Linux/Mac

### 3-Terminal Startup (Run in Parallel)

#### Terminal 1: Hardhat Blockchain Node
```bash
cd blockchain_node
npx hardhat node
```
✅ **Wait for:** HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

#### Terminal 2: Flask API Server
```bash
cd automation
python api_server.py
```
✅ **Wait for:** Running on http://0.0.0.0:5001 + Model loaded successfully!

#### Terminal 3: React Development Server
```bash
npm install
npm run dev
```
✅ **Wait for:** Local: http://localhost:5173/

### Open Browser
Navigate to http://localhost:5173/ to access the IntelliDex dashboard.

## 📋 Features

### 🏠 Dashboard
- Real-time market overview
- Portfolio tracking
- Performance metrics

### 📈 Manual Trading
- Buy/Sell BTC with risk analysis
- Real-time price feeds
- Trade history

### 🤖 Automated Trading Bots
- **Grid Bot:** Automated buy/sell grids
- **Trend Bot:** Follows market trends
- **Swing Bot:** Captures price swings

### 🔒 Security Monitor
- ML-powered fraud detection
- Risk scoring for all trades
- Real-time alerts

### 📊 AI Predictions
- Multi-horizon price predictions (15min to 7 days)
- Confidence scores
- Sentiment analysis

### ⛓️ Blockchain Integration
- Immutable trade logging
- Smart contract security
- Decentralized audit trail

## 🛠️ Architecture

### System Components
1. **Data Collection Layer**
   - Historical data fetcher (Binance API)
   - Continuous real-time collector (Kraken + Alpha Vantage)
   - Sentiment analysis integration

2. **Machine Learning Layer**
   - Multi-task Transformer model
   - Automated model updates
   - Performance tracking

3. **Blockchain Layer**
   - Ethereum smart contracts
   - Trade execution logging
   - Security monitoring

4. **Frontend Layer**
   - React dashboard
   - Real-time updates
   - Bot management

5. **API Layer**
   - Flask REST API
   - Model serving
   - Blockchain integration

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/dareworks0/IntelliDex.git
cd intellidex-trader-main
```

### 2. Python Environment
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r automation/requirements_api.txt
pip install -r automation/requirements_security.txt
```

### 3. Node.js Dependencies
```bash
npm install
```

### 4. Blockchain Setup
```bash
cd blockchain
npm install
npx hardhat compile
```

### 5. Train ML Model (Optional - Pre-trained available)
```bash
cd automation
python multi_task_transformer.py
```

## 🚀 Running the System

### Full System Startup
1. **Terminal 1:** Blockchain
   ```bash
   cd blockchain_node
   npx hardhat node
   ```

2. **Terminal 2:** API Server
   ```bash
   cd automation
   python api_server.py
   ```

3. **Terminal 3:** Frontend
   ```bash
   npm run dev
   ```

### Quick Test (2 minutes)
1. Open http://localhost:5173/
2. Go to Trading page
3. Click "Buy 0.1 BTC"
4. Check Security Monitor - your trade appears with risk score!

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predictions` | GET | Get ML predictions |
| `/model_performance` | GET | Model metrics |
| `/log_trade_execution` | POST | Log trade to blockchain |
| `/analyze_transaction_security` | POST | Risk analysis |
| `/get_trade_executions` | GET | Trade history |
| `/get_bot_performance` | GET | Bot metrics |

## 🔍 Ports & Services

| Service | Port | URL |
|---------|------|-----|
| React App | 5173 | http://localhost:5173 |
| Flask API | 5001 | http://localhost:5001 |
| Hardhat Node | 8545 | http://localhost:8545 |

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

### Model Not Trained
```bash
cd automation
python multi_task_transformer.py
```

### API Connection Issues
- Ensure Flask server is running on port 5001
- Check firewall settings
- Verify Python environment activation

### Blockchain Issues
```bash
cd blockchain_node
npx hardhat clean
npx hardhat compile
npx hardhat node
```

## 📁 Project Structure

```
intellidex-trader-main/
├── automation/           # ML models & API server
├── blockchain/           # Smart contracts & deployment
├── blockchain_node/      # Hardhat development node
├── src/                  # React frontend
├── public/               # Static assets
├── docs/                 # Documentation
└── README.md
```

## 📚 Documentation

- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Complete startup guide
- [BLOCKCHAIN_ARCHITECTURE.md](BLOCKCHAIN_ARCHITECTURE.md) - System design
- [COMPLETE_SYSTEM_GUIDE.md](COMPLETE_SYSTEM_GUIDE.md) - API reference
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details

## 🛡️ Security Features

- ML-based fraud detection trained on 17,321+ records
- Real-time risk scoring
- Blockchain immutable audit trail
- Automated security monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the documentation files
- Open an issue on GitHub

---

**Built with:** React, TypeScript, Python, PyTorch, Ethereum, Hardhat
