import multiprocessing
import time
import subprocess
import schedule
import json
import logging
import os
import sys

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - [MASTER_ORCHESTRATOR] - %(message)s',
    handlers=[logging.FileHandler("orchestrator.log"), logging.StreamHandler()]
)

def run_script(script_name):
    """Continuously run a script and restart it if it crashes."""
    logging.info(f"Starting continuous background process: {script_name}")
    
    if not os.path.exists(script_name):
        logging.error(f"Cannot run {script_name}: File not found.")
        return

    while True:
        try:
            subprocess.run([sys.executable, script_name], check=True)
        except subprocess.CalledProcessError as e:
            logging.error(f"Process {script_name} crashed (exit code {e.returncode}). Auto-restarting in 60s...")
            time.sleep(60)
        except KeyboardInterrupt:
            logging.info(f"Stopped {script_name} via keyboard interrupt.")
            break

def run_prediction_loop(script_name, interval_minutes):
    """Run inference script at a defined interval."""
    if not script_name or not os.path.exists(script_name):
        logging.warning(f"Inference script {script_name} not found. Skipping prediction loop.")
        return
        
    logging.info(f"Starting execution loop for {script_name} every {interval_minutes} minutes")
    interval_seconds = interval_minutes * 60
    
    while True:
        start_time = time.time()
        try:
            subprocess.run([sys.executable, script_name], check=True)
        except subprocess.CalledProcessError as e:
            logging.error(f"Inference {script_name} failed. Next interval queued.")
            
        elapsed = time.time() - start_time
        sleep_time = max(0, interval_seconds - elapsed)
        time.sleep(sleep_time)

def scheduled_job(name, script_path):
    """Runs a one-off scheduled cron job"""
    logging.info(f"========== CRON JOB TRIGGER: {name} ({script_path}) ==========")
    if not os.path.exists(script_path):
        logging.warning(f"Cannot run {name}: {script_path} not found.")
        return
        
    try:
        subprocess.run([sys.executable, script_path], check=True)
        logging.info(f"✓ {name} completed successfully.")
    except Exception as e:
        logging.error(f"❌ {name} failed: {e}")

def main():
    logging.info("Master Orchestrator Initializing DUAL SYSTEM Operations...")
    
    # -------------------------------------------------------------
    # 1. SCHEDULED JOBS (NIGHTLY TRANSFORMER AUTOMATION)
    # -------------------------------------------------------------
    # 2:00 AM - Merge new sentiment data from continuous collector
    schedule.every().day.at("02:00").do(scheduled_job, "Sentiment Merge", "08_merge_sentiment.py")
    
    # 2:15 AM - Aggregate and Sync unifying files
    schedule.every().day.at("02:15").do(scheduled_job, "Data Sync", "09_unified_data_manager.py")
    
    # 2:30 AM - Transformer Auto-Updater (Incremental Fine-tuning)
    schedule.every().day.at("02:30").do(scheduled_job, "Model Updater", "10_auto_model_updater.py")
    
    # 3:00 AM - Micro-Trader Auto-Updater (24-Hour API poll and fine-tune)
    schedule.every().day.at("03:00").do(scheduled_job, "Micro Updater", "18_auto_micro_updater.py")
    
    # 4:00 AM - Performance tracking (Validates predictions, triggers fix if MAPE > 5%)
    schedule.every().day.at("04:00").do(scheduled_job, "Performance Tracker", "11_performance_tracker.py")

    # -------------------------------------------------------------
    # 2. CONTINUOUS BACKGROUND PROCESSES
    # -------------------------------------------------------------
    processes = []
    
    # A) Transformer Continuous Collector (Kraken 5m / Sentiment 30m)
    processes.append(
        multiprocessing.Process(
            target=run_script, 
            args=("06_transformer_collector.py",),
            name="Transformer_Collector"
        )
    )
    
    # B) Micro Trader Continuous Collector (Binance 1m)
    processes.append(
        multiprocessing.Process(
            target=run_script, 
            args=("07_micro_collector.py",),
            name="Micro_Collector"
        )
    )
    
    # C) Micro-Trader prediction loop (runs every 5 minutes)
    # In lieu of a direct prediction script, we can just log readiness for now, 
    # as 04_train_micro_model.py built the model but user runs inference externally or locally
    # If a specific script exists, we would launch it right here.
    
    for p in processes:
        p.start()
        
    logging.info(f"All {len(processes)} background processes started. Entering main orchestrator loop.")
        
    try:
        # Check schedule every second
        while True:
            schedule.run_pending()
            
            # Health check processes
            for p in processes:
                if not p.is_alive():
                    logging.warning(f"Process {p.name} died! Restart is handled internally by loop wrapper.")
                    
            time.sleep(60) # Wake up every minute to check schedule
            
    except KeyboardInterrupt:
        logging.info("Keyboard interrupt received. Shutting down Dual System gracefully...")
        for p in processes:
            p.terminate()
            p.join(timeout=5)
            if p.is_alive():
                p.kill()
        logging.info("Shutdown complete.")

if __name__ == "__main__":
    main()
