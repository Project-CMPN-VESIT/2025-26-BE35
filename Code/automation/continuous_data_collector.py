"""
Continuous Data Collector - Runs 24/7
Collects price data every 5 min + sentiment every 30 min
"""

import pandas as pd
import numpy as np
import requests
import time
from datetime import datetime, timedelta
import os
import logging

# Setup logging
logging.basicConfig(
    filename='data_collector.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class ContinuousDataCollector:
    def __init__(self, 
                 price_csv="btc_live_updated.csv",
                 sentiment_csv="bitcoin_sentiment_history.csv",
                 alpha_vantage_key="PYGL0XHNAZXLAELP"):
        self.price_csv = price_csv
        self.sentiment_csv = sentiment_csv
        self.alpha_vantage_key = alpha_vantage_key
        self.last_sentiment_time = datetime.now()
        
    def fetch_kraken_price(self):
        """Fetch latest price from Kraken"""
        try:
            url = "https://api.kraken.com/0/public/Ticker"
            params = {"pair": "XBTUSD"}
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if 'result' in data:
                ticker_data = data['result']['XXBTZUSD']
                
                price_data = {
                    'time': datetime.now(),
                    'open': float(ticker_data['o']),
                    'high': float(ticker_data['h'][1]),
                    'low': float(ticker_data['l'][1]),
                    'close': float(ticker_data['c'][0]),
                    'volume': float(ticker_data['v'][1])
                }
                return price_data
        except Exception as e:
            logging.error(f"Error fetching Kraken price: {e}")
        return None
    
    def calculate_technical_indicators(self, df):
        """Calculate technical indicators"""
        # Moving averages
        for window in [7, 14, 30]:
            if len(df) >= window:
                df[f'sma_{window}'] = df['close'].rolling(window=window).mean()
                df[f'ema_{window}'] = df['close'].ewm(span=window, adjust=False).mean()
        
        # Price changes
        df['price_change'] = df['close'].diff()
        df['price_change_pct'] = df['close'].pct_change() * 100
        
        # Volatility
        if len(df) >= 7:
            df['volatility_7d'] = df['close'].rolling(window=7).std()
        
        # RSI
        if len(df) >= 14:
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi_14'] = 100 - (100 / (1 + rs))
        
        return df
    
    def update_price_data(self):
        """Update price CSV with latest data"""
        try:
            # Fetch latest price
            new_data = self.fetch_kraken_price()
            if new_data is None:
                return False
            
            # Load existing data or create new
            if os.path.exists(self.price_csv):
                df = pd.read_csv(self.price_csv)
                df['time'] = pd.to_datetime(df['time'])
            else:
                df = pd.DataFrame()
            
            # Append new data
            new_df = pd.DataFrame([new_data])
            df = pd.concat([df, new_df], ignore_index=True)
            
            # Remove duplicates
            df = df.drop_duplicates(subset=['time'], keep='last')
            df = df.sort_values('time')
            
            # Calculate indicators
            df = self.calculate_technical_indicators(df)
            
            # Save
            df.to_csv(self.price_csv, index=False)
            logging.info(f"Updated price data: ${new_data['close']:,.2f}")
            return True
            
        except Exception as e:
            logging.error(f"Error updating price: {e}")
            return False
    
    def fetch_sentiment(self):
        """Fetch sentiment from Alpha Vantage"""
        try:
            url = "https://www.alphavantage.co/query"
            params = {
                "function": "NEWS_SENTIMENT",
                "tickers": "CRYPTO:BTC",
                "apikey": self.alpha_vantage_key,
                "limit": 50
            }
            response = requests.get(url, params=params, timeout=15)
            data = response.json()
            
            if 'feed' in data and len(data['feed']) > 0:
                sentiments = []
                for article in data['feed']:
                    sentiment_score = 0
                    relevance_score = 0
                    
                    if 'ticker_sentiment' in article:
                        for ticker in article['ticker_sentiment']:
                            if ticker['ticker'] == 'CRYPTO:BTC':
                                sentiment_score = float(ticker['ticker_sentiment_score'])
                                relevance_score = float(ticker['relevance_score'])
                                break
                    
                    sentiments.append({
                        'timestamp': datetime.now(),
                        'sentiment_score': sentiment_score,
                        'relevance_score': relevance_score,
                        'title': article.get('title', '')[:100]
                    })
                
                return sentiments
        except Exception as e:
            logging.error(f"Error fetching sentiment: {e}")
        return None
    
    def update_sentiment_data(self):
        """Update sentiment CSV"""
        try:
            # Check if 30 min passed
            time_diff = (datetime.now() - self.last_sentiment_time).seconds
            if time_diff < 1800:  # 30 minutes
                return False
            
            # Fetch sentiment
            sentiments = self.fetch_sentiment()
            if sentiments is None or len(sentiments) == 0:
                return False
            
            # Load existing or create new
            if os.path.exists(self.sentiment_csv):
                df = pd.read_csv(self.sentiment_csv)
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            else:
                df = pd.DataFrame()
            
            # Append new data
            new_df = pd.DataFrame(sentiments)
            df = pd.concat([df, new_df], ignore_index=True)
            
            # Remove duplicates
            df = df.drop_duplicates(subset=['timestamp', 'title'], keep='last')
            df = df.sort_values('timestamp')
            
            # Save
            df.to_csv(self.sentiment_csv, index=False)
            
            avg_sentiment = new_df['sentiment_score'].mean()
            logging.info(f"Updated sentiment: {avg_sentiment:.4f} ({len(sentiments)} articles)")
            
            self.last_sentiment_time = datetime.now()
            return True
            
        except Exception as e:
            logging.error(f"Error updating sentiment: {e}")
            return False
    
    def run(self):
        """Main loop - runs forever"""
        print("="*60)
        print("CONTINUOUS DATA COLLECTOR STARTED")
        print("="*60)
        print(f"Price updates: Every 5 minutes")
        print(f"Sentiment updates: Every 30 minutes")
        print(f"Press Ctrl+C to stop")
        print("="*60)
        
        iteration = 0
        
        while True:
            try:
                iteration += 1
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                # Update price
                price_success = self.update_price_data()
                
                # Update sentiment (every 30 min)
                sentiment_success = self.update_sentiment_data()
                
                # Status
                status = f"[{current_time}] Iteration {iteration}"
                if price_success:
                    status += " | Price: ✓"
                if sentiment_success:
                    status += " | Sentiment: ✓"
                print(status)
                
                # Wait 5 minutes
                time.sleep(300)
                
            except KeyboardInterrupt:
                print("\n\nStopping data collector...")
                logging.info("Data collector stopped by user")
                break
            except Exception as e:
                logging.error(f"Error in main loop: {e}")
                print(f"Error: {e}. Retrying in 60 seconds...")
                time.sleep(60)


if __name__ == "__main__":
    # Initialize with your API key
    collector = ContinuousDataCollector(
        alpha_vantage_key="PYGL0XHNAZXLAELP"  # Replace!
    )
    
    collector.run()
