@echo off
REM IntelliDex Security Monitor - Windows Setup Script
REM Initializes all components for development

cls
echo.
echo 🚀 IntelliDex Security Monitor - Windows Setup Script
echo =====================================================
echo.

REM Check Python version
echo [1/5] Checking Python version...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)
echo.

REM Check Node version
echo [2/5] Checking Node version...
node --version
npm --version
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js and npm
    pause
    exit /b 1
)
echo.

REM Install Python dependencies
echo [3/5] Installing Python dependencies...
cd automation\finale
pip install -r requirements_security.txt
pip install -r requirements_api.txt
cd ..\..
echo ✓ Python dependencies installed
echo.

REM Install Node dependencies
echo [4/5] Installing Node dependencies...
call npm install
echo ✓ Node dependencies installed
echo.

REM Initialize SQLite database
echo [5/5] Creating SQLite databases...
python << 'EOF'
import sqlite3
import os

# Security alerts database
db_path = "automation\\finale\\security_alerts.db"

if not os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Security alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_hash TEXT UNIQUE NOT NULL,
        timestamp TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        transaction_hash TEXT,
        severity TEXT NOT NULL,
        risk_score REAL NOT NULL,
        threat_type TEXT NOT NULL,
        ipfs_cid TEXT,
        blockchain_tx TEXT,
        recorded_on_chain BOOLEAN DEFAULT 0
    )
    """)
    
    # Wallet risk profiles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wallet_risk_profiles (
        wallet_address TEXT PRIMARY KEY,
        risk_score REAL DEFAULT 0,
        threat_count INTEGER DEFAULT 0,
        blacklist_status BOOLEAN DEFAULT 0,
        last_alert_timestamp TEXT
    )
    """)
    
    # Threat patterns table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS threat_patterns (
        pattern_name TEXT PRIMARY KEY,
        description TEXT,
        confidence_score REAL,
        last_detected TEXT
    )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_wallet ON security_alerts(wallet_address)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_severity ON security_alerts(severity)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON security_alerts(timestamp)")
    
    conn.commit()
    conn.close()
    print("✓ Security alerts database initialized")
else:
    print("✓ Security alerts database already exists")

# Prediction verification database
db_prediction = "automation\\finale\\prediction_verification.db"
if not os.path.exists(db_prediction):
    conn = sqlite3.connect(db_prediction)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        prediction_hash TEXT UNIQUE,
        ipfs_cid TEXT,
        blockchain_tx TEXT
    )
    """)
    
    conn.commit()
    conn.close()
    print("✓ Predictions database initialized")
else:
    print("✓ Predictions database already exists")
EOF

echo.

REM Check for .env file
if not exist ".env" (
    echo Creating .env template...
    (
        echo # IntelliDex Environment Configuration
        echo.
        echo # Flask API
        echo FLASK_ENV=development
        echo FLASK_DEBUG=True
        echo API_PORT=5001
        echo.
        echo # Blockchain
        echo HARDHAT_NETWORK=localhost
        echo HARDHAT_RPC_URL=http://localhost:8545
        echo.
        echo # IPFS (Pinata^)
        echo PINATA_API_KEY=your_pinata_api_key_here
        echo PINATA_SECRET_KEY=your_pinata_secret_key_here
        echo.
        echo # Database
        echo SECURITY_ALERTS_DB=automation\finale\security_alerts.db
        echo PREDICTION_VERIFICATION_DB=automation\finale\prediction_verification.db
        echo.
        echo # React
        echo VITE_API_URL=http://localhost:5001
    ) > .env
    echo ⚠️  Created .env template - please configure with your API keys
) else (
    echo ✓ .env already exists
)
echo.

echo =====================================================
echo ✓ Setup complete!
echo.
echo Next steps:
echo 1. Configure .env with your Pinata API keys
echo 2. Start Hardhat node:
echo    cd blockchain_node ^&^& npx hardhat node
echo.
echo 3. Start Flask API (in another terminal):
echo    cd automation\finale ^&^& python api_server.py
echo.
echo 4. Start React dev (in another terminal):
echo    npm run dev
echo.
echo Then open: http://localhost:5173/security-monitor
echo.
echo For more information, see: SECURITY_MONITOR_QUICK_START.md
echo =====================================================
echo.
pause
