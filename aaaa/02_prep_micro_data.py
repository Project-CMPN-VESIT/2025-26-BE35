"""
02_prep_micro_data.py
Fetches REAL 1-minute historical data from Binance for the Micro Trader model
and engineers 11 technical features.
"""

import os
import requests
import time
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

def fetch_real_1m_data(days=30, symbol="BTCUSDT"):
    print(f"Fetching {days} days of real 1m tracking data from Binance...")
    url = "https://api.binance.com/api/v3/klines"
    
    end_time = int(datetime.now().timestamp() * 1000)
    start_time = int((datetime.now() - timedelta(days=days)).timestamp() * 1000)
    
    limit = 1000
    all_data = []
    current_time = start_time
    
    while current_time < end_time:
        try:
            params = {
                "symbol": symbol,
                "interval": "1m",
                "startTime": current_time,
                "endTime": end_time,
                "limit": limit
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if not data:
                break
                
            all_data.extend(data)
            current_time = data[-1][6] + 1
            
            print(f"\rFetched {len(all_data)} 1-min candles...", end="")
            time.sleep(0.3)  # Respect Binance rate limits
            
        except Exception as e:
            print(f"\nAPI Error: {e}")
            break
            
    print("\nDownload complete.")
    
    df = pd.DataFrame(all_data, columns=[
        'open_time', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_volume', 'trades', 'taker_buy_base',
        'taker_buy_quote', 'ignore'
    ])
    
    df['timestamp'] = pd.to_datetime(df['open_time'], unit='ms')
    df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
        
    return df

def make_micro_features(df):
    print("Engineering 11 precise technical features for the Micro Model...")
    df = df.copy()
    
    # 1-5. Core Price & Vol (open, high, low, close, volume already present)
    
    # 6. Return percentage
    df['return'] = df['close'].pct_change().fillna(0)
    
    # 7. Simple RSI (14)
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs)).fillna(50)
    
    # 8. Volume Mean (5m)
    df['vol_mean'] = df['volume'].rolling(5).mean().fillna(df['volume'])
    
    # 9. Momentum (3m)
    df['momentum'] = df['close'] - df['close'].shift(3).fillna(0)
    
    # 10. EMA 9
    df['ema_9'] = df['close'].ewm(span=9, adjust=False).mean()
    
    # 11. EMA 21
    df['ema_21'] = df['close'].ewm(span=21, adjust=False).mean()
    
    # Drop rows with NaN from rolling calculations
    df = df.dropna()
    
    features = df[['timestamp', 'open', 'high', 'low', 'close', 'volume', 'return', 'rsi', 'vol_mean', 'momentum', 'ema_9', 'ema_21']]
    return features

def write_real_micro_data():
    raw_df = fetch_real_1m_data(days=30)
    features_df = make_micro_features(raw_df)
    
    out_path = os.path.join(DATA_DIR, 'real_1min_features.csv')
    features_df.to_csv(out_path, index=False)
    
    print(f"\nSuccess! Built {len(features_df)} massive real-time 1m tracking rows.")
    print(f"Saved optimized features to: {out_path}")
    print("Ready to run -> python 04_train_micro_model.py")

if __name__ == '__main__':
    write_real_micro_data()
