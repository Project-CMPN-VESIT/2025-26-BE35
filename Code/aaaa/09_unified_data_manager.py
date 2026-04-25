import pandas as pd
import json
import os
import logging
from datetime import datetime
import traceback

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - [DATA_MANAGER] - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("data_manager.log"), logging.StreamHandler()]
)

class UnifiedDataManager:
    def __init__(self, config_path="13_system_config.json"):
        with open(config_path, "r") as f:
            self.config = json.load(f)
            
    def aggregate_to_daily(self, minute_df):
        df_sorted = minute_df.sort_values('time')
        df_sorted.set_index("time", inplace=True)
        # Resample to daily frequency
        daily = df_sorted.resample('D').agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'volume': 'sum'
        }).reset_index()
        # Drop days where data might be missing (NaNs)
        daily.dropna(inplace=True)
        return daily
        
    def sync_data(self):
        logging.info("Syncing data (Raw -> 1-min -> Daily)")
        raw_path = os.path.join(self.config["data"]["raw_dir"], "latest_1m.csv")
        
        if not os.path.exists(raw_path):
            logging.warning(f"No raw data found at {raw_path} yet.")
            return
            
        try:
            df = pd.read_csv(raw_path)
            df['time'] = pd.to_datetime(df['time'])
            
            # Sub-5-minute Micro Trader continuous live feed
            micro_file = self.config["data"]["micro_file"]
            df.to_csv(micro_file, index=False)
            logging.info(f"Updated micro LIVE file: {micro_file}")
            
            # Unified daily data for the Multi-Task Transformer
            unified_path = self.config["data"]["unified_file"]
            if os.path.exists(unified_path):
                # Update existing daily unified data
                unified_df = pd.read_csv(unified_path)
                unified_df['time'] = pd.to_datetime(unified_df['time'])
                
                # Get the daily aggregation of the fresh batch
                new_daily = self.aggregate_to_daily(df)
                
                # Merge into the unified data: overwrite rows where time matches, or append new rows
                # Setting index to 'time' simplifies updating
                unified_df.set_index('time', inplace=True)
                new_daily.set_index('time', inplace=True)
                
                unified_df.update(new_daily)
                # For completely new days:
                new_days = new_daily[~new_daily.index.isin(unified_df.index)]
                unified_df = pd.concat([unified_df, new_days])
                
                unified_df.reset_index(inplace=True)
                unified_df.sort_values('time', inplace=True)
                unified_df.to_csv(unified_path, index=False)
                logging.info(f"Aggregated and synced with unified continuous data: {unified_path}")
            else:
                daily_df = self.aggregate_to_daily(df)
                daily_df.to_csv(unified_path, index=False)
                logging.info(f"Created initial {unified_path}")
                
        except Exception as e:
            logging.error(f"Error during data synchronization: {e}")
            logging.debug(traceback.format_exc())

if __name__ == "__main__":
    manager = UnifiedDataManager()
    manager.sync_data()
