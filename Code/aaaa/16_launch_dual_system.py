import os
import sys
import subprocess
import time

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def check_dependencies():
    print("Checking dependencies...")
    required = ["pandas", "requests", "schedule"]
    missing = []
    
    for req in required:
        try:
            __import__(req)
        except ImportError:
            missing.append(req)
            
    if missing:
        print(f"❌ Missing required packages: {', '.join(missing)}")
        print(f"Please install via: pip install {' '.join(missing)}")
        sys.exit(1)
    print("✅ Dependencies check passed")

def check_files():
    print("Checking critical system files...")
    critical_files = [
        "13_system_config.json",
        "07_micro_collector.py",
        "09_unified_data_manager.py",
        "14_master_orchestrator.py"
    ]
    
    for file in critical_files:
        if not os.path.exists(file):
            print(f"❌ Missing file: {file}")
            sys.exit(1)
            
    print("✅ Essential system files present")

def main():
    clear_screen()
    print("================================================================")
    print("🚀 INTELLIDEX DUAL SYSTEM: Micro-Trader & Multi-Task Transformer")
    print("================================================================")
    print("\nInitializing Startup Sequence...\n")
    
    check_dependencies()
    check_files()
    
    print("\nSyncing data before full startup...")
    try:
        subprocess.run([sys.executable, "09_unified_data_manager.py"], check=True)
    except Exception as e:
        print(f"⚠️ Initial data sync warning: {e}")
        
    print("\nStarting Master Orchestrator in 3 seconds...")
    time.sleep(3)
    
    try:
        # Hand over execution to the master orchestrator
        subprocess.run([sys.executable, "14_master_orchestrator.py"])
    except KeyboardInterrupt:
        print("\n\nSystem stopped by user. Graceful shutdown complete.")
    except Exception as e:
        print(f"\n❌ System crash: {e}")

if __name__ == "__main__":
    main()
