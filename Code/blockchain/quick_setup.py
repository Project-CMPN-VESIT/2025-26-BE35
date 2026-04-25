"""
QUICK SETUP - BLOCKCHAIN INTEGRATION
=====================================
Automates the complete setup process

This script will:
1. Check all dependencies
2. Install blockchain features
3. Create configuration files
4. Run initial tests
5. Generate helpful commands

Usage:
    python quick_setup.py
"""

import subprocess
import sys
from pathlib import Path
import json
import os


class QuickSetup:
    """
    Automated setup for blockchain integration
    """
    
    def __init__(self):
        self.steps_completed = []
        self.errors = []
    
    def print_header(self, text):
        """Print formatted header"""
        print(f"\n{'='*70}")
        print(f"{text}")
        print(f"{'='*70}\n")
    
    def check_dependencies(self):
        """Check if all required packages are installed"""
        self.print_header("STEP 1: Checking Dependencies")
        
        required = [
            'web3',
            'eth_account',
            'pandas',
            'numpy',
            'scikit-learn',
            'requests'
        ]
        
        missing = []
        
        for package in required:
            try:
                __import__(package)
                print(f"✅ {package}")
            except ImportError:
                print(f"❌ {package} - MISSING")
                missing.append(package)
        
        if missing:
            print(f"\n⚠️  Missing packages: {', '.join(missing)}")
            print(f"\nInstall them with:")
            print(f"pip install {' '.join(missing)}")
            
            response = input("\nWould you like to install them now? (y/n): ")
            if response.lower() == 'y':
                try:
                    subprocess.check_call([
                        sys.executable, "-m", "pip", "install"
                    ] + missing)
                    print("\n✅ All dependencies installed!")
                    self.steps_completed.append("Dependencies installed")
                except Exception as e:
                    self.errors.append(f"Failed to install dependencies: {e}")
                    return False
            else:
                return False
        else:
            print("\n✅ All dependencies are installed!")
            self.steps_completed.append("Dependencies checked")
        
        return True
    
    def check_required_files(self):
        """Check if all blockchain package files exist"""
        self.print_header("STEP 2: Checking Blockchain Package Files")
        
        required_files = [
            "PACKAGE_A_blockchain_logger.py",
            "PACKAGE_A_ipfs_storage.py",
            "PACKAGE_B_transaction_security.py",
            "PACKAGE_C_smart_contracts.sol",
            "PACKAGE_C_deploy.py",
            "master_integration.py"
        ]
        
        missing = []
        
        for file in required_files:
            if Path(file).exists():
                print(f"✅ {file}")
            else:
                print(f"❌ {file} - MISSING")
                missing.append(file)
        
        if missing:
            print(f"\n⚠️  Missing files: {', '.join(missing)}")
            print(f"   Please ensure all package files are in the current directory")
            self.errors.append("Missing package files")
            return False
        else:
            print("\n✅ All package files found!")
            self.steps_completed.append("Package files verified")
        
        return True
    
    def create_config_files(self):
        """Create configuration files"""
        self.print_header("STEP 3: Creating Configuration Files")
        
        # Create blockchain_config.json
        config = {
            "blockchain_enabled": True,
            "ipfs_enabled": True,
            "auto_upload_to_chain": False,
            "use_local_ipfs": False,
            "network": "sepolia"
        }
        
        config_file = Path("blockchain_config.json")
        if config_file.exists():
            print(f"⚠️  blockchain_config.json already exists")
            response = input("   Overwrite? (y/n): ")
            if response.lower() != 'y':
                print("   Keeping existing config")
                return True
        
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✅ Created blockchain_config.json")
        
        # Create .env template
        env_file = Path(".env")
        if not env_file.exists():
            env_template = """# BLOCKCHAIN INTEGRATION CONFIGURATION
# =====================================

# Ethereum Network Access (Get free key from infura.io or alchemy.com)
INFURA_URL=https://sepolia.infura.io/v3/YOUR_KEY_HERE

# Your Ethereum Private Key (NEVER commit this to git!)
PRIVATE_KEY=your_private_key_here

# IPFS/Pinata Configuration (Get free key from pinata.cloud)
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here

# IMPORTANT: Add .env to .gitignore to keep your keys safe!
"""
            with open(env_file, 'w') as f:
                f.write(env_template)
            
            print(f"✅ Created .env template")
            print(f"   📝 IMPORTANT: Edit .env and add your API keys")
        else:
            print(f"✅ .env file already exists")
        
        # Create .gitignore if it doesn't exist
        gitignore = Path(".gitignore")
        if not gitignore.exists():
            with open(gitignore, 'w') as f:
                f.write("# Environment variables\n.env\n\n")
                f.write("# Database\n*.db\n\n")
                f.write("# Backups\nbackups/\n\n")
                f.write("# IPFS\npredictions_for_ipfs/\nipfs_upload_log.json\n")
            
            print(f"✅ Created .gitignore")
        
        self.steps_completed.append("Configuration files created")
        return True
    
    def check_prediction_system(self):
        """Check if prediction system exists"""
        self.print_header("STEP 4: Checking Prediction System")
        
        predictor_file = Path("unified_predictor.py")
        
        if predictor_file.exists():
            print(f"✅ unified_predictor.py found")
            self.steps_completed.append("Prediction system verified")
            return True
        else:
            print(f"⚠️  unified_predictor.py not found in current directory")
            print(f"   This is OK if you haven't built your prediction system yet")
            print(f"   You can integrate blockchain features later")
            return False
    
    def install_integration(self, has_predictor):
        """Run master_integration.py to install blockchain features"""
        self.print_header("STEP 5: Installing Blockchain Integration")
        
        if not has_predictor:
            print(f"⏭️  Skipping integration (no prediction system found)")
            print(f"   Run 'python master_integration.py --install' later")
            return True
        
        print(f"Installing blockchain features into your prediction system...")
        
        response = input("\nProceed with installation? (y/n): ")
        if response.lower() != 'y':
            print(f"⏭️  Skipped - run 'python master_integration.py --install' manually")
            return True
        
        try:
            result = subprocess.run(
                [sys.executable, "master_integration.py", "--install"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"\n✅ Blockchain features installed successfully!")
                self.steps_completed.append("Blockchain integration installed")
                return True
            else:
                print(f"\n❌ Installation failed:")
                print(result.stderr)
                self.errors.append("Installation failed")
                return False
        
        except Exception as e:
            print(f"\n❌ Error during installation: {e}")
            self.errors.append(f"Installation error: {e}")
            return False
    
    def run_tests(self):
        """Run basic tests"""
        self.print_header("STEP 6: Running Tests")
        
        print("Testing blockchain logger...")
        try:
            from Code.blockchain.PACKAGE_A_blockchain_logger import PredictionBlockchainLogger
            logger = PredictionBlockchainLogger()
            print("✅ Blockchain logger working")
        except Exception as e:
            print(f"❌ Blockchain logger test failed: {e}")
            self.errors.append("Blockchain logger test failed")
            return False
        
        print("\nTesting IPFS storage...")
        try:
            from Code.blockchain.PACKAGE_A_ipfs_storage import IPFSStorage
            ipfs = IPFSStorage(use_local_node=False)
            print("✅ IPFS storage working")
        except Exception as e:
            print(f"❌ IPFS storage test failed: {e}")
            self.errors.append("IPFS storage test failed")
            return False
        
        print("\nTesting transaction security...")
        try:
            from Code.blockchain.PACKAGE_B_transaction_security import TransactionRiskScorer
            scorer = TransactionRiskScorer()
            print("✅ Transaction security working")
        except Exception as e:
            print(f"❌ Transaction security test failed: {e}")
            self.errors.append("Transaction security test failed")
            return False
        
        print("\n✅ All tests passed!")
        self.steps_completed.append("Tests completed")
        return True
    
    def print_summary(self):
        """Print setup summary"""
        self.print_header("SETUP COMPLETE!")
        
        print("✅ Steps Completed:")
        for step in self.steps_completed:
            print(f"   • {step}")
        
        if self.errors:
            print("\n⚠️  Errors Encountered:")
            for error in self.errors:
                print(f"   • {error}")
        
        print("\n" + "="*70)
        print("NEXT STEPS:")
        print("="*70)
        
        print("\n1. 📝 Configure API Keys:")
        print("   • Edit .env file")
        print("   • Add Infura/Alchemy URL (get free key)")
        print("   • Add Pinata API keys (optional, for IPFS)")
        
        print("\n2. 🚀 Run Your Prediction System:")
        print("   python unified_predictor.py")
        print("   (Predictions will be automatically logged!)")
        
        print("\n3. 👀 View Prediction Logs:")
        print("   python view_logs.py")
        print("   python view_logs.py --stats")
        
        print("\n4. 📊 Check Integration Status:")
        print("   python master_integration.py --status")
        
        print("\n5. 📚 Read Documentation:")
        print("   Open COMPLETE_INTEGRATION_README.md")
        
        print("\n" + "="*70)
        print("🎉 Your blockchain-verified prediction system is ready!")
        print("="*70)


def main():
    """Main setup process"""
    
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║   BLOCKCHAIN-VERIFIED BTC PREDICTION SYSTEM - QUICK SETUP         ║
╚═══════════════════════════════════════════════════════════════════╝

This script will set up blockchain integration for your prediction system.
It will:
  • Check dependencies
  • Verify package files
  • Create configuration
  • Install blockchain features
  • Run tests

Press Ctrl+C at any time to cancel.
    """)
    
    input("Press Enter to continue...")
    
    setup = QuickSetup()
    
    # Run setup steps
    if not setup.check_dependencies():
        print("\n❌ Setup cancelled - please install dependencies first")
        return
    
    if not setup.check_required_files():
        print("\n❌ Setup cancelled - missing required files")
        return
    
    if not setup.create_config_files():
        print("\n❌ Setup failed at configuration step")
        return
    
    has_predictor = setup.check_prediction_system()
    
    if has_predictor:
        setup.install_integration(has_predictor)
    
    setup.run_tests()
    
    setup.print_summary()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)
