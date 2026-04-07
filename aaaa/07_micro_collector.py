import time
import json
import pandas as pd
import requests
from datetime import datetime
import os
import logging
import traceback

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [DATA_COLLECTOR] - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("data_collector_enhanced.log"), logging.StreamHandler()]
)

def load_config():
    try:
        with open("13_system_config.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        logging.error("01_system_config.json not found. Ensure it is in the same directory.")
        return None

def fetch_binance_data(symbol="BTCUSDT", interval="1m", limit=100):
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        df = pd.DataFrame(data, columns=[
            "timestamp", "open", "high", "low", "close", "volume",
            "close_time", "quote_av", "trades", "tb_base_av", "tb_quote_av", "ignore"
        ])
        df["time"] = pd.to_datetime(df["timestamp"], unit="ms")
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype(float)
        return df[["time", "open", "high", "low", "close", "volume"]]
    except Exception as e:
        logging.error(f"Error fetching data: {e}")
        return None

def main():
    config = load_config()
    if not config:
        return
        
    os.makedirs(config["data"]["raw_dir"], exist_ok=True)
    os.makedirs(config["data"]["processed_dir"], exist_ok=True)
    
    logging.info("Starting Enhanced Data Collector for Universal Data Source...")
    
    refresh_interval = config["data"].get("refresh_interval_seconds", 60)
    
    while True:
        try:
            df = fetch_binance_data()
            if df is not None:
                # Save latest 1-min data
                out_path = os.path.join(config["data"]["raw_dir"], "latest_1m.csv")
                df.to_csv(out_path, index=False)
                logging.info(f"Successfully fetched and saved {len(df)} records at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        except Exception as e:
            logging.error(f"Collector loop error: {e}")
            logging.debug(traceback.format_exc())
            
        time.sleep(refresh_interval)

if __name__ == "__main__":
    main()
