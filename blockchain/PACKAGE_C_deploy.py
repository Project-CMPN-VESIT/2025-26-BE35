"""
SMART CONTRACT DEPLOYMENT & INTEGRATION
========================================
Deploy and interact with PredictionRegistry and SecurityOracle contracts

Requirements:
    pip install web3 eth-account python-dotenv

Setup:
    1. Get Infura/Alchemy API key (free tier)
    2. Create .env file with:
       PRIVATE_KEY=your_private_key
       INFURA_URL=https://sepolia.infura.io/v3/YOUR_KEY
"""

from web3 import Web3
from eth_account import Account
import json
from pathlib import Path
from typing import Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()


class SmartContractManager:
    """
    Manages deployment and interaction with prediction/security contracts
    """
    
    def __init__(self, network: str = "sepolia"):
        """
        Args:
            network: "sepolia" (testnet) or "mainnet"
        """
        self.network = network
        
        # Connect to network
        if network == "sepolia":
            # Sepolia testnet (free test ETH from faucet)
            provider_url = os.getenv("INFURA_URL", "https://sepolia.infura.io/v3/YOUR_KEY")
        elif network == "local":
            # Local Ganache/Hardhat
            provider_url = "http://127.0.0.1:8545"
        else:
            raise ValueError("Unsupported network")
        
        self.w3 = Web3(Web3.HTTPProvider(provider_url))
        
        # Load account
        if network == "local":
            private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        else:
            private_key = os.getenv("PRIVATE_KEY")
            
        if private_key:
            self.account = Account.from_key(private_key.strip())
            self.address = self.account.address
        else:
            self.account = None
            self.address = None
            print("[WARN]  No private key found. Read-only mode.")
        
        # Contract addresses (set after deployment)
        self.prediction_contract_address = None
        self.security_contract_address = None
        
        # Load deployed addresses if they exist
        self.load_deployed_addresses()
    
    def check_connection(self) -> bool:
        """Check if connected to blockchain"""
        try:
            connected = self.w3.is_connected()
            if connected:
                print(f"[OK] Connected to {self.network}")
                print(f"   Block number: {self.w3.eth.block_number}")
                if self.address:
                    balance = self.w3.eth.get_balance(self.address)
                    print(f"   Your address: {self.address}")
                    print(f"   Balance: {self.w3.from_wei(balance, 'ether')} ETH")
            return connected
        except Exception as e:
            print(f"[ERR] Connection failed: {str(e)}")
            return False
    
    def compile_contract(self, contract_name: str) -> Dict:
        """
        In production, use: solc or hardhat to compile
        For demo, we'll use pre-compiled ABI
        """
        
        if contract_name == "PredictionRegistry":
            # Simplified ABI for demo (in production, compile the full .sol file)
            abi = [
                {
                    "inputs": [
                        {"internalType": "bytes32", "name": "_predictionHash", "type": "bytes32"},
                        {"internalType": "uint256", "name": "_currentPrice", "type": "uint256"},
                        {"internalType": "string", "name": "_ipfsCID", "type": "string"}
                    ],
                    "name": "recordPrediction",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"internalType": "bytes32", "name": "_predictionHash", "type": "bytes32"}
                    ],
                    "name": "getPrediction",
                    "outputs": [
                        {"internalType": "address", "name": "predictor", "type": "address"},
                        {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
                        {"internalType": "uint256", "name": "currentPrice", "type": "uint256"},
                        {"internalType": "string", "name": "ipfsCID", "type": "string"},
                        {"internalType": "bool", "name": "verified", "type": "bool"},
                        {"internalType": "uint8", "name": "averageAccuracy", "type": "uint8"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getTotalPredictions",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            # Placeholder bytecode (replace with actual compiled bytecode)
            bytecode = "0x608060405234801..."
            
        elif contract_name == "SecurityOracle":
            abi = [
                {
                    "inputs": [
                        {"internalType": "address", "name": "_flaggedAddress", "type": "address"},
                        {"internalType": "uint8", "name": "_riskScore", "type": "uint8"},
                        {"internalType": "string", "name": "_alertType", "type": "string"}
                    ],
                    "name": "createAlert",
                    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"internalType": "address", "name": "_address", "type": "address"}
                    ],
                    "name": "isHighRisk",
                    "outputs": [
                        {"internalType": "bool", "name": "", "type": "bool"},
                        {"internalType": "uint8", "name": "", "type": "uint8"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            bytecode = "0x608060405234801..."
        
        return {"abi": abi, "bytecode": bytecode}
    
    def deploy_prediction_contract(self) -> str:
        """Deploy PredictionRegistry contract"""
        
        if not self.account:
            print("[ERR] Cannot deploy without private key")
            return None
        
        print("\n📝 Deploying PredictionRegistry contract...")
        
        contract_data = self.compile_contract("PredictionRegistry")
        
        # Create contract instance
        Contract = self.w3.eth.contract(
            abi=contract_data['abi'],
            bytecode=contract_data['bytecode']
        )
        
        # Build deployment transaction
        try:
            # Estimate gas
            gas_estimate = 3000000  # Adjust based on actual contract
            
            # Get gas price
            gas_price = self.w3.eth.gas_price
            
            print(f"   Estimated gas: {gas_estimate}")
            print(f"   Gas price: {self.w3.from_wei(gas_price, 'gwei')} gwei")
            
            # Build transaction
            transaction = Contract.constructor().build_transaction({
                'from': self.address,
                'nonce': self.w3.eth.get_transaction_count(self.address),
                'gas': gas_estimate,
                'gasPrice': gas_price,
            })
            
            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction,
                private_key=self.account.key
            )
            
            # Send transaction
            print("   Sending transaction...")
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            print(f"   Transaction hash: {tx_hash.hex()}")
            print("   Waiting for confirmation...")
            
            # Wait for receipt
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            contract_address = tx_receipt['contractAddress']
            
            print(f"[OK] Contract deployed at: {contract_address}")
            
            self.prediction_contract_address = contract_address
            self.save_deployed_addresses()
            
            return contract_address
            
        except Exception as e:
            print(f"[ERR] Deployment failed: {str(e)}")
            return None
    
    def record_prediction_on_chain(
        self,
        prediction_hash: str,
        current_price: float,
        ipfs_cid: str
    ) -> Optional[str]:
        """
        Record a prediction on the blockchain
        
        Args:
            prediction_hash: SHA-256 hash from blockchain_logger
            current_price: BTC price in USD (will be converted to cents)
            ipfs_cid: IPFS CID where full prediction is stored
            
        Returns:
            Transaction hash if successful
        """
        
        if not self.prediction_contract_address:
            print("[ERR] Prediction contract not deployed")
            return None
        
        contract_data = self.compile_contract("PredictionRegistry")
        contract = self.w3.eth.contract(
            address=self.prediction_contract_address,
            abi=contract_data['abi']
        )
        
        try:
            # Convert inputs to blockchain format
            pred_hash_bytes = bytes.fromhex(prediction_hash)
            price_cents = int(current_price * 100)  # Convert to cents
            
            # Build transaction
            transaction = contract.functions.recordPrediction(
                pred_hash_bytes,
                price_cents,
                ipfs_cid
            ).build_transaction({
                'from': self.address,
                'nonce': self.w3.eth.get_transaction_count(self.address),
                'gas': 500000,
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Sign and send
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction,
                private_key=self.account.key
            )
            
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            
            print(f"[OK] Prediction recorded on blockchain!")
            print(f"   Transaction: {tx_hash.hex()}")
            
            return tx_hash.hex()
            
        except Exception as e:
            import sys
            print(f"[ERR] Failed to record prediction: {str(e)}", file=sys.stderr)
            return None
    
    def get_prediction_from_chain(self, prediction_hash: str) -> Optional[Dict]:
        """Retrieve prediction from blockchain"""
        
        if not self.prediction_contract_address:
            return None
        
        contract_data = self.compile_contract("PredictionRegistry")
        contract = self.w3.eth.contract(
            address=self.prediction_contract_address,
            abi=contract_data['abi']
        )
        
        try:
            pred_hash_bytes = bytes.fromhex(prediction_hash)
            
            result = contract.functions.getPrediction(pred_hash_bytes).call()
            
            return {
                "predictor": result[0],
                "timestamp": result[1],
                "current_price": result[2] / 100,  # Convert back to dollars
                "ipfs_cid": result[3],
                "verified": result[4],
                "accuracy": result[5]
            }
            
        except Exception as e:
            print(f"[ERR] Failed to retrieve prediction: {str(e)}")
            return None
    
    def save_deployed_addresses(self):
        """Save deployed contract addresses"""
        addresses = {
            "network": self.network,
            "prediction_contract": self.prediction_contract_address,
            "security_contract": self.security_contract_address
        }
        
        with open("deployed_contracts.json", 'w') as f:
            json.dump(addresses, f, indent=2)
        
        print(f"[OK] Saved contract addresses to deployed_contracts.json")
    
    def load_deployed_addresses(self):
        """Load previously deployed contract addresses"""
        if Path("deployed_contracts.json").exists():
            with open("deployed_contracts.json", 'r') as f:
                addresses = json.load(f)
            
            if addresses['network'] == self.network:
                self.prediction_contract_address = addresses.get('prediction_contract')
                self.security_contract_address = addresses.get('security_contract')
                print(f"[OK] Loaded deployed contract addresses")


# ============================================
# INTEGRATION WITH PREDICTION SYSTEM
# ============================================

def integrate_blockchain_with_prediction_system():
    """
    Complete integration example:
    Prediction System → Blockchain Logger → IPFS → Smart Contract
    """
    
    from PACKAGE_A_blockchain_logger import PredictionBlockchainLogger
    from PACKAGE_A_ipfs_storage import IPFSPredictionManager
    
    # Initialize all systems
    blockchain_logger = PredictionBlockchainLogger()
    ipfs_manager = IPFSPredictionManager()
    contract_manager = SmartContractManager(network="sepolia")
    
    # Check connection
    if not contract_manager.check_connection():
        print("[ERR] Cannot connect to blockchain")
        return
    
    # Example: After your unified_predictor.py runs...
    
    # Step 1: Log prediction locally with crypto proof
    log_result = blockchain_logger.log_prediction(
        current_price=52347.0,
        predictions={"15min": 52450.0, "1hr": 52680.0},
        confidence_scores={"15min": 0.87, "1hr": 0.81},
        sentiment_score=0.65
    )
    
    print(f"\n📝 Step 1: Local logging complete")
    print(f"   Hash: {log_result['prediction_hash'][:16]}...")
    
    # Step 2: Upload to IPFS
    prediction_data = blockchain_logger.export_for_blockchain(
        log_result['prediction_id']
    )
    
    ipfs_result = ipfs_manager.store_prediction_with_logging(
        prediction_id=log_result['prediction_id'],
        prediction_data=prediction_data['data']
    )
    
    print(f"\n☁️  Step 2: IPFS upload complete")
    print(f"   CID: {ipfs_result['cid'][:16]}...")
    
    # Step 3: Record on blockchain
    tx_hash = contract_manager.record_prediction_on_chain(
        prediction_hash=log_result['prediction_hash'],
        current_price=52347.0,
        ipfs_cid=ipfs_result['cid']
    )
    
    if tx_hash:
        print(f"\n⛓️  Step 3: Blockchain recording complete")
        print(f"   TX: {tx_hash[:16]}...")
        print(f"\n[OK] PREDICTION NOW IMMUTABLE AND PUBLICLY VERIFIABLE!")


if __name__ == "__main__":
    print("="*70)
    print("SMART CONTRACT DEPLOYMENT & INTEGRATION")
    print("="*70)
    
    manager = SmartContractManager(network="sepolia")
    
    # Check connection
    manager.check_connection()
    
    print("\n📋 DEPLOYMENT STEPS:")
    print("1. Get free Sepolia ETH from faucet: sepoliafaucet.com")
    print("2. Add your private key to .env file")
    print("3. Run: python PACKAGE_C_deploy.py")
    print("\n4. Integration:")
    print("   - Predictions logged locally (SQLite)")
    print("   - Stored on IPFS (permanent)")
    print("   - Recorded on Ethereum (immutable)")
    print("   - Publicly verifiable forever!")
