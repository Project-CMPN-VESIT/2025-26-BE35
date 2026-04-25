#!/bin/bash
# IntelliDex Security Monitor - Setup Script
# Initializes all components for development

echo "🚀 IntelliDex Security Monitor - Setup Script"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${BLUE}Checking Python version...${NC}"
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Check Node version
echo -e "${BLUE}Checking Node version...${NC}"
node_version=$(node --version)
npm_version=$(npm --version)
echo "Node version: $node_version"
echo "NPM version: $npm_version"

echo ""
echo -e "${BLUE}Setting up Security Monitor components...${NC}"
echo ""

# Step 1: Install Python dependencies
echo -e "${YELLOW}[1/5]${NC} Installing Python dependencies..."
cd automation/finale
pip install -r requirements_security.txt
pip install -r requirements_api.txt 2>/dev/null || echo "Note: Some requirements may already be installed"
cd - > /dev/null
echo -e "${GREEN}✓ Python dependencies installed${NC}"
echo ""

# Step 2: Install Node dependencies
echo -e "${YELLOW}[2/5]${NC} Installing Node dependencies..."
npm install > /dev/null 2>&1 && echo -e "${GREEN}✓ Node dependencies installed${NC}" || echo -e "${YELLOW}Note: npm install may already be complete${NC}"
echo ""

# Step 3: Initialize SQLite database
echo -e "${YELLOW}[3/5]${NC} Initializing SQLite database..."
python3 << 'EOF'
import sqlite3
import os

db_path = "automation/finale/security_alerts.db"

# Create database if it doesn't exist
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
db_prediction = "automation/finale/prediction_verification.db"
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
echo -e "${GREEN}✓ SQLite databases initialized${NC}"
echo ""

# Step 4: Setup Hardhat (if .env not configured)
echo -e "${YELLOW}[4/5]${NC} Checking Hardhat setup..."
if [ ! -f "blockchain_node/.env" ]; then
    echo "Note: Configure blockchain_node/.env with your settings"
    echo "      (Already set up if Hardhat was initialized)"
fi
echo -e "${GREEN}✓ Hardhat check complete${NC}"
echo ""

# Step 5: Create .env template if needed
echo -e "${YELLOW}[5/5]${NC} Checking environment configuration..."
if [ ! -f ".env" ]; then
    cat > .env << 'EOL'
# IntelliDex Environment Configuration

# Flask API
FLASK_ENV=development
FLASK_DEBUG=True
API_PORT=5001

# Blockchain
HARDHAT_NETWORK=localhost
HARDHAT_RPC_URL=http://localhost:8545

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here

# Database
SECURITY_ALERTS_DB=automation/finale/security_alerts.db
PREDICTION_VERIFICATION_DB=automation/finale/prediction_verification.db

# React
VITE_API_URL=http://localhost:5001

EOL
    echo "⚠️  Created .env template - please configure with your API keys"
else
    echo "✓ .env already exists"
fi
echo ""

echo "=============================================="
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure .env with your Pinata API keys"
echo "2. Start Hardhat node: cd blockchain_node && npx hardhat node"
echo "3. Start Flask API: cd automation/finale && python api_server.py"
echo "4. Start React dev: npm run dev"
echo ""
echo "Then open: http://localhost:5173/security-monitor"
echo ""
echo "For more information, see SECURITY_MONITOR_QUICK_START.md"
echo "=============================================="
