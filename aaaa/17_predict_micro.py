import os
import pandas as pd
import numpy as np
import torch
import importlib.util
from datetime import datetime

class MicroPredictor:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.micro_def_path = "05_micro_model_def.py"
        self.model_path = "models/micro_model.pth"
        self.live_data_path = "data/raw/latest_1m.csv"
        self.historical_features = "data/real_1min_features.csv"
        
        self._load_model()
        self._calculate_scalers()

    def _load_model(self):
        # dynamically load the micro model class
        if not os.path.exists(self.micro_def_path):
            raise FileNotFoundError(f"Missing architecture file {self.micro_def_path}")
            
        spec = importlib.util.spec_from_file_location('micro_model', self.micro_def_path)
        micro_mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(micro_mod)
        LightweightMicroModel = getattr(micro_mod, 'LightweightMicroModel')
        
        self.model = LightweightMicroModel(input_dim=11).to(self.device)
        self.model.load_state_dict(torch.load(self.model_path, map_location=self.device))
        self.model.eval()
        
    def _calculate_scalers(self):
        """We used Simple Z-Score scaling in 04_. We must recreate the exact std and mean."""
        df = pd.read_csv(self.historical_features)
        feature_cols = ['open', 'high', 'low', 'close', 'volume', 'return', 'rsi', 'vol_mean', 'momentum', 'ema_9', 'ema_21']
        df = df.dropna()
        X_hist = df[feature_cols].values.astype(np.float32)
        
        self.mean = np.mean(X_hist, axis=0)
        self.std = np.std(X_hist, axis=0)
        self.feature_cols = feature_cols

    def get_latest_prediction(self):
        # The Orchestrator constantly saves latest minute to latest_1m.csv 
        # but if it hasn't written yet, we can fall back to the historical fetcher!
        if os.path.exists(self.live_data_path) and os.path.getsize(self.live_data_path) > 0:
            df = pd.read_csv(self.live_data_path)
        else:
            df = pd.read_csv(self.historical_features)
            
        # Ensure we have the calculated features for the last row
        if 'rsi' not in df.columns:
            # We reconstruct the 11 features locally to avoid timestamp mismatches
            df['return'] = df['close'].pct_change().fillna(0)
            
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi'] = 100 - (100 / (1 + rs)).fillna(50)
            
            df['vol_mean'] = df['volume'].rolling(5).mean().fillna(df['volume'])
            df['momentum'] = df['close'] - df['close'].shift(3).fillna(0)
            df['ema_9'] = df['close'].ewm(span=9, adjust=False).mean()
            df['ema_21'] = df['close'].ewm(span=21, adjust=False).mean()
            
            df = df.dropna()
            
        recent_row = df[self.feature_cols].iloc[-1].values.astype(np.float32)
        last_price = df['close'].iloc[-1]
        
        # Scale
        scaled_row = (recent_row - self.mean) / (self.std + 1e-8)
        
        with torch.no_grad():
            tensor_seq = torch.FloatTensor(scaled_row).unsqueeze(0).to(self.device)
            out = self.model(tensor_seq)
            prob = torch.sigmoid(out).item()
            
        direction = "UP 📈" if prob > 0.5 else "DOWN 📉"
        confidence = abs(prob - 0.5) * 200
        
        print("\n" + "="*50)
        print("⚡ MICRO-TRADER LIVE 1-MIN PREDICTION ⚡")
        print("="*50)
        print(f"Current Price   : ${last_price:,.2f}")
        print(f"Next 1-min Close: {direction}")
        print(f"Confidence      : {confidence:.1f}%")
        print(f"Bullish weight  : {prob:.4f}")
        print("="*50)

if __name__ == "__main__":
    try:
        predictor = MicroPredictor()
        predictor.get_latest_prediction()
    except Exception as e:
        print(f"❌ Error loading Micro Predictor: {e}")
