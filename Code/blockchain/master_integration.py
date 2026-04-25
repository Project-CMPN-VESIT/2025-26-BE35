"""
MASTER INTEGRATION SCRIPT
==========================
Connects your existing 7-script prediction system with blockchain logging

This script modifies your unified_predictor.py to automatically:
1. Log predictions with cryptographic proof
2. Upload to IPFS
3. Record on blockchain (optional, based on config)

USAGE:
    python master_integration.py --install    # Add blockchain features
    python master_integration.py --uninstall  # Remove blockchain features
    python master_integration.py --status     # Check integration status
"""

import sys
import shutil
from pathlib import Path
import json
from datetime import datetime


class BlockchainIntegration:
    """
    Integrates blockchain logging into existing prediction system
    """
    
    def __init__(self):
        self.backup_dir = Path("backups")
        self.backup_dir.mkdir(exist_ok=True)
        
        self.config = {
            "blockchain_enabled": True,
            "ipfs_enabled": True,
            "auto_upload_to_chain": False,  # Manual by default (costs gas)
            "use_local_ipfs": False,  # Use Pinata by default
            "network": "sepolia"  # Testnet
        }
        
        self.config_file = Path("blockchain_config.json")
        self.load_config()
    
    def load_config(self):
        """Load configuration"""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                self.config.update(json.load(f))
    
    def save_config(self):
        """Save configuration"""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def backup_file(self, filepath: Path):
        """Create backup of original file"""
        if filepath.exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backup_dir / f"{filepath.name}.{timestamp}.backup"
            shutil.copy(filepath, backup_path)
            print(f"✅ Backed up {filepath.name} to {backup_path}")
    
    def install_blockchain_features(self):
        """
        Modify unified_predictor.py to include blockchain logging
        """
        print("="*70)
        print("INSTALLING BLOCKCHAIN FEATURES")
        print("="*70)
        
        predictor_file = Path("unified_predictor.py")
        
        if not predictor_file.exists():
            print(f"\n⚠️  {predictor_file} not found in current directory")
            print("   Please run this script from your project directory")
            return False
        
        # Backup original
        self.backup_file(predictor_file)
        
        # Read current content
        with open(predictor_file, 'r') as f:
            content = f.read()
        
        # Check if already integrated
        if "BLOCKCHAIN_INTEGRATION_MARKER" in content:
            print("\n✅ Blockchain features already installed!")
            return True
        
        # Add imports at top
        import_code = '''
# === BLOCKCHAIN_INTEGRATION_MARKER ===
# Added by master_integration.py
from PACKAGE_A_blockchain_logger import PredictionBlockchainLogger
from PACKAGE_A_ipfs_storage import IPFSPredictionManager
from PACKAGE_C_deploy import SmartContractManager
import json

# Initialize blockchain components
try:
    blockchain_logger = PredictionBlockchainLogger()
    ipfs_manager = IPFSPredictionManager()
    
    # Load config
    with open('blockchain_config.json', 'r') as f:
        blockchain_config = json.load(f)
    
    contract_manager = SmartContractManager(network=blockchain_config['network'])
    
    BLOCKCHAIN_ENABLED = blockchain_config['blockchain_enabled']
    IPFS_ENABLED = blockchain_config['ipfs_enabled']
    AUTO_UPLOAD_TO_CHAIN = blockchain_config['auto_upload_to_chain']
    
except Exception as e:
    print(f"⚠️  Blockchain integration not available: {e}")
    BLOCKCHAIN_ENABLED = False
    IPFS_ENABLED = False
    AUTO_UPLOAD_TO_CHAIN = False
# === END BLOCKCHAIN_INTEGRATION ===

'''
        
        # Add logging function
        logging_code = '''

def log_prediction_to_blockchain(current_price, predictions, confidence_scores, sentiment_score):
    """
    Log prediction with blockchain proof
    Called automatically after each prediction
    """
    if not BLOCKCHAIN_ENABLED:
        return
    
    try:
        # Step 1: Log locally with cryptographic hash
        log_result = blockchain_logger.log_prediction(
            current_price=current_price,
            predictions=predictions,
            confidence_scores=confidence_scores,
            sentiment_score=sentiment_score
        )
        
        print(f"\\n🔐 BLOCKCHAIN: Prediction logged with cryptographic proof")
        print(f"   Hash: {log_result['prediction_hash'][:16]}...")
        print(f"   Timestamp: {log_result['timestamp']}")
        
        # Step 2: Upload to IPFS (if enabled)
        if IPFS_ENABLED:
            prediction_data = blockchain_logger.export_for_blockchain(
                log_result['prediction_id']
            )
            
            ipfs_result = ipfs_manager.store_prediction_with_logging(
                prediction_id=log_result['prediction_id'],
                prediction_data=prediction_data['data']
            )
            
            print(f"   IPFS CID: {ipfs_result['cid'][:16]}...")
            
            # Step 3: Record on blockchain (if auto-upload enabled)
            if AUTO_UPLOAD_TO_CHAIN and contract_manager.account:
                tx_hash = contract_manager.record_prediction_on_chain(
                    prediction_hash=log_result['prediction_hash'],
                    current_price=current_price,
                    ipfs_cid=ipfs_result['cid']
                )
                
                if tx_hash:
                    print(f"   ⛓️  Recorded on blockchain: {tx_hash[:16]}...")
            else:
                print(f"   💡 Run manually: python manual_upload_to_chain.py")
        
        return log_result
        
    except Exception as e:
        print(f"⚠️  Blockchain logging failed: {e}")
        return None

'''
        
        # Insert at beginning of file (after existing imports)
        lines = content.split('\n')
        
        # Find where imports end
        import_end = 0
        for i, line in enumerate(lines):
            if line.strip() and not line.strip().startswith('import') and not line.strip().startswith('from'):
                import_end = i
                break
        
        # Insert blockchain imports
        lines.insert(import_end, import_code)
        
        # Insert logging function before main()
        for i, line in enumerate(lines):
            if 'if __name__ == "__main__":' in line or 'def main(' in line:
                lines.insert(i, logging_code)
                break
        
        # Find where predictions are made and add logging call
        # Look for pattern where predictions dict is created
        for i, line in enumerate(lines):
            if 'predictions = {' in line or 'predictions={' in line:
                # Find the closing of this dict
                j = i
                while j < len(lines) and '}' not in lines[j]:
                    j += 1
                
                # Insert logging call after predictions are ready
                if j < len(lines):
                    log_call = '''
    # === BLOCKCHAIN LOGGING ===
    log_prediction_to_blockchain(
        current_price=current_price,
        predictions=predictions,
        confidence_scores=confidence_scores,
        sentiment_score=sentiment_score
    )
    # === END BLOCKCHAIN LOGGING ===
'''
                    lines.insert(j + 1, log_call)
                break
        
        # Write modified content
        modified_content = '\n'.join(lines)
        
        with open(predictor_file, 'w') as f:
            f.write(modified_content)
        
        print(f"\n✅ Successfully integrated blockchain features into {predictor_file}")
        print("\n📋 What was added:")
        print("   • Automatic cryptographic hash generation")
        print("   • IPFS storage for detailed predictions")
        print("   • Optional blockchain recording")
        print("\n💡 Your predictions are now cryptographically provable!")
        
        return True
    
    def uninstall_blockchain_features(self):
        """Remove blockchain integration and restore original"""
        print("="*70)
        print("UNINSTALLING BLOCKCHAIN FEATURES")
        print("="*70)
        
        predictor_file = Path("unified_predictor.py")
        
        if not predictor_file.exists():
            print(f"\n⚠️  {predictor_file} not found")
            return False
        
        # Read current content
        with open(predictor_file, 'r') as f:
            content = f.read()
        
        # Check if blockchain features are installed
        if "BLOCKCHAIN_INTEGRATION_MARKER" not in content:
            print("\n✅ No blockchain features to remove")
            return True
        
        # Backup current version
        self.backup_file(predictor_file)
        
        # Remove blockchain sections
        lines = content.split('\n')
        cleaned_lines = []
        
        skip = False
        for line in lines:
            if "BLOCKCHAIN_INTEGRATION_MARKER" in line or "=== BLOCKCHAIN LOGGING ===" in line:
                skip = True
            elif "=== END BLOCKCHAIN" in line:
                skip = False
                continue
            
            if not skip:
                cleaned_lines.append(line)
        
        # Write cleaned content
        cleaned_content = '\n'.join(cleaned_lines)
        
        with open(predictor_file, 'w') as f:
            f.write(cleaned_content)
        
        print(f"\n✅ Blockchain features removed from {predictor_file}")
        print("   Original functionality restored")
        
        return True
    
    def check_status(self):
        """Check integration status"""
        print("="*70)
        print("BLOCKCHAIN INTEGRATION STATUS")
        print("="*70)
        
        predictor_file = Path("unified_predictor.py")
        
        # Check if predictor exists
        if not predictor_file.exists():
            print("\n❌ unified_predictor.py not found in current directory")
            return
        
        # Check if integrated
        with open(predictor_file, 'r') as f:
            content = f.read()
        
        is_integrated = "BLOCKCHAIN_INTEGRATION_MARKER" in content
        
        print(f"\n📊 Integration Status:")
        print(f"   Prediction System: {'✅ Found' if predictor_file.exists() else '❌ Not found'}")
        print(f"   Blockchain Features: {'✅ Installed' if is_integrated else '❌ Not installed'}")
        
        # Check component files
        components = {
            "Blockchain Logger": Path("PACKAGE_A_blockchain_logger.py"),
            "IPFS Storage": Path("PACKAGE_A_ipfs_storage.py"),
            "Transaction Security": Path("PACKAGE_B_transaction_security.py"),
            "Smart Contracts": Path("PACKAGE_C_smart_contracts.sol"),
            "Contract Deployment": Path("PACKAGE_C_deploy.py")
        }
        
        print(f"\n📦 Components:")
        for name, path in components.items():
            status = "✅" if path.exists() else "❌"
            print(f"   {status} {name}")
        
        # Check config
        print(f"\n⚙️  Configuration:")
        for key, value in self.config.items():
            print(f"   {key}: {value}")
        
        # Check database
        db_file = Path("prediction_verification.db")
        if db_file.exists():
            import sqlite3
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM predictions")
            count = cursor.fetchone()[0]
            conn.close()
            print(f"\n💾 Database:")
            print(f"   Total predictions logged: {count}")
        
        if is_integrated:
            print(f"\n✅ System is ready! Run unified_predictor.py as normal.")
            print(f"   Predictions will be automatically logged to blockchain.")
        else:
            print(f"\n💡 Run: python master_integration.py --install")


def main():
    """Main entry point"""
    
    integrator = BlockchainIntegration()
    
    if len(sys.argv) < 2:
        print("BLOCKCHAIN INTEGRATION FOR BTC PREDICTION SYSTEM")
        print("="*70)
        print("\nUsage:")
        print("  python master_integration.py --install    # Add blockchain features")
        print("  python master_integration.py --uninstall  # Remove blockchain features")
        print("  python master_integration.py --status     # Check status")
        print("\nDocumentation: See COMPLETE_INTEGRATION_README.md")
        return
    
    command = sys.argv[1].lower()
    
    if command == "--install":
        success = integrator.install_blockchain_features()
        if success:
            integrator.save_config()
            print("\n" + "="*70)
            print("✅ INSTALLATION COMPLETE!")
            print("="*70)
            print("\n🚀 Next Steps:")
            print("1. Run your prediction system as normal:")
            print("   python unified_predictor.py")
            print("\n2. Predictions will be automatically logged!")
            print("\n3. View logs:")
            print("   python view_blockchain_logs.py")
            
    elif command == "--uninstall":
        integrator.uninstall_blockchain_features()
        
    elif command == "--status":
        integrator.check_status()
        
    elif command == "--config":
        print("\nCurrent Configuration:")
        print(json.dumps(integrator.config, indent=2))
        
    else:
        print(f"Unknown command: {command}")
        print("Use --install, --uninstall, or --status")


if __name__ == "__main__":
    main()
