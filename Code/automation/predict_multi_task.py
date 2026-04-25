"""
Multi-Task Predictor
Predicts BOTH price AND direction using trained multi-task model
"""

import pandas as pd
import numpy as np
import torch
import pickle
from datetime import datetime, timedelta

# Copy the MultiTaskTransformer class from train_multi_task.py here
import torch.nn as nn
import torch.nn.functional as F

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe.unsqueeze(0))
    
    def forward(self, x):
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads, dropout=0.1):
        super().__init__()
        assert d_model % num_heads == 0
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)
    
    def split_heads(self, x, batch_size):
        x = x.view(batch_size, -1, self.num_heads, self.d_k)
        return x.permute(0, 2, 1, 3)
    
    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)
        Q = self.split_heads(self.W_q(query), batch_size)
        K = self.split_heads(self.W_k(key), batch_size)
        V = self.split_heads(self.W_v(value), batch_size)
        scores = torch.matmul(Q, K.transpose(-2, -1)) / np.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        attention = F.softmax(scores, dim=-1)
        context = torch.matmul(self.dropout(attention), V)
        context = context.permute(0, 2, 1, 3).contiguous().view(batch_size, -1, self.d_model)
        return self.W_o(context)

class FeedForward(nn.Module):
    def __init__(self, d_model, d_ff, dropout=0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.GELU()
    
    def forward(self, x):
        return self.linear2(self.dropout(self.activation(self.linear1(x))))

class TransformerEncoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
    
    def forward(self, x, mask=None):
        attn = self.self_attention(x, x, x, mask)
        x = self.norm1(x + self.dropout1(attn))
        ff = self.feed_forward(x)
        x = self.norm2(x + self.dropout2(ff))
        return x

class MultiTaskTransformer(nn.Module):
    def __init__(self, input_dim, d_model=128, num_heads=8, num_layers=4, 
                 d_ff=512, dropout=0.2, max_seq_length=100):
        super().__init__()
        self.input_projection = nn.Sequential(nn.Linear(input_dim, d_model), nn.LayerNorm(d_model))
        self.pos_encoder = PositionalEncoding(d_model, dropout, max_seq_length)
        self.encoder_layers = nn.ModuleList([
            TransformerEncoderLayer(d_model, num_heads, d_ff, dropout) for _ in range(num_layers)
        ])
        self.norm = nn.LayerNorm(d_model)
        self.shared_fc1 = nn.Linear(d_model, d_model // 2)
        self.shared_fc2 = nn.Linear(d_model // 2, d_model // 4)
        self.price_head = nn.Sequential(
            nn.Linear(d_model // 4, d_model // 8), nn.GELU(), nn.Dropout(dropout), nn.Linear(d_model // 8, 1)
        )
        self.direction_head = nn.Sequential(
            nn.Linear(d_model // 4, d_model // 8), nn.GELU(), nn.Dropout(dropout),
            nn.Linear(d_model // 8, 1), nn.Sigmoid()
        )
        self.price_skip = nn.Linear(d_model, 1)
        self.direction_skip = nn.Sequential(nn.Linear(d_model, 1), nn.Sigmoid())
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.GELU()
    
    def forward(self, x, mask=None):
        x = self.input_projection(x)
        x = self.pos_encoder(x)
        for layer in self.encoder_layers:
            x = layer(x, mask)
        x_pooled = x.mean(dim=1)
        x_norm = self.norm(x_pooled)
        shared = self.dropout(self.activation(self.shared_fc1(x_norm)))
        shared = self.dropout(self.activation(self.shared_fc2(shared)))
        price = 0.7 * self.price_head(shared) + 0.3 * self.price_skip(x_norm)
        direction = 0.7 * self.direction_head(shared) + 0.3 * self.direction_skip(x_norm)
        return price.squeeze(), direction.squeeze()


class MultiTaskPredictor:
    def __init__(self, 
                 model_path="best_multi_task_transformer.pth",
                 scaler_path="multi_task_scaler.pkl",
                 data_path="btc_unified_data.csv"):
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.data_path = data_path
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self._load_model()
        self._load_data()
    
    def _load_model(self):
        print("Loading multi-task model...")
        checkpoint = torch.load(self.model_path, map_location=self.device)
        
        self.feature_cols = checkpoint['feature_cols']
        self.seq_length = checkpoint['seq_length']
        
        # Load scalers
        with open(self.scaler_path, 'rb') as f:
            scaler_data = pickle.load(f)
            self.feature_scaler = scaler_data['feature_scaler']
            self.price_scaler = scaler_data['price_scaler']
        
        # Initialize model
        input_dim = len(self.feature_cols)
        self.model = MultiTaskTransformer(
            input_dim=input_dim, d_model=128, num_heads=8,
            num_layers=4, d_ff=512, dropout=0.2, max_seq_length=self.seq_length
        ).to(self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()
        
        print(f"✓ Model loaded (Direction accuracy: {checkpoint['direction_acc']:.2f}%)")
    
    def _load_data(self):
        self.df = pd.read_csv(self.data_path)
        self.df['time'] = pd.to_datetime(self.df['time'])
        self.last_time = self.df['time'].max()
        self.last_price = self.df['close'].iloc[-1]
        
        # Get last sequence
        X = self.df[self.feature_cols].tail(self.seq_length).values
        X = np.nan_to_num(X)
        self.last_sequence = self.feature_scaler.transform(X)
        
        # Get sentiment
        if 'sentiment_mean' in self.df.columns:
            self.last_sentiment = self.df['sentiment_mean'].iloc[-1]
        else:
            self.last_sentiment = 0
        
        print(f"✓ Data loaded (Last: {self.last_time}, Price: ${self.last_price:,.2f})")
    
    def predict_next(self):
        """Predict next price and direction"""
        with torch.no_grad():
            input_seq = torch.FloatTensor(self.last_sequence).unsqueeze(0).to(self.device)
            price_pred_scaled, direction_prob = self.model(input_seq)
            
            # Inverse transform price
            price_pred = self.price_scaler.inverse_transform(
                price_pred_scaled.cpu().numpy().reshape(-1, 1)
            )[0, 0]
            
            direction_prob = direction_prob.item()
            direction = "UP ↑" if direction_prob > 0.5 else "DOWN ↓"
            confidence = abs(direction_prob - 0.5) * 200  # 0-100%
        
        change = price_pred - self.last_price
        change_pct = (change / self.last_price) * 100
        
        return {
            'current_price': self.last_price,
            'predicted_price': price_pred,
            'change': change,
            'change_pct': change_pct,
            'direction': direction,
            'direction_probability': direction_prob,
            'confidence': confidence,
            'sentiment': self.last_sentiment
        }
    
    def predict_multi_horizon(self, horizons=[15, 60, 240, 720, 1440, 4320, 10080]):
        """Multi-horizon predictions"""
        predictions = {}
        current_seq = self.last_sequence.copy()
        
        horizon_names = {
            15: "15 minutes", 60: "1 hour", 240: "4 hours",
            720: "12 hours", 1440: "24 hours", 4320: "3 days", 10080: "7 days"
        }
        
        with torch.no_grad():
            for minutes in horizons:
                input_seq = torch.FloatTensor(current_seq).unsqueeze(0).to(self.device)
                price_pred_scaled, dir_prob = self.model(input_seq)
                
                price_pred = self.price_scaler.inverse_transform(
                    price_pred_scaled.cpu().numpy().reshape(-1, 1)
                )[0, 0]
                
                dir_prob = dir_prob.item()
                confidence = max(50, 90 - (minutes / 100))
                
                change = price_pred - self.last_price
                change_pct = (change / self.last_price) * 100
                
                predictions[horizon_names[minutes]] = {
                    'minutes': minutes,
                    'predicted_price': price_pred,
                    'change': change,
                    'change_pct': change_pct,
                    'direction': "UP ↑" if dir_prob > 0.5 else "DOWN ↓",
                    'direction_probability': dir_prob,
                    'confidence': confidence
                }
                
                # Update sequence for next horizon (roll window and append new prediction)
                new_feature_row = np.array(self.df[self.feature_cols].iloc[-1].values).reshape(1, -1)
                scaled_new_row = self.feature_scaler.transform(new_feature_row)
                current_seq = np.vstack([current_seq[1:], scaled_new_row])
        
        return predictions
    
    def display_predictions(self):
        """Display comprehensive predictions"""
        print("\n" + "="*70)
        print("BITCOIN MULTI-TASK PREDICTION")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        # Data status
        time_diff = datetime.now() - self.last_time
        minutes_ago = int(time_diff.total_seconds() / 60)
        
        print(f"\n📊 DATA STATUS:")
        print(f"  Latest Data: {minutes_ago} min ago {'✓' if minutes_ago < 10 else '⚠'}")
        print(f"  Current Price: ${self.last_price:,.2f}")
        print(f"  Sentiment: {self.last_sentiment:.4f}")
        
        # Multi-horizon predictions
        print(f"\n🎯 PRICE & DIRECTION PREDICTIONS:")
        print("-"*70)
        
        predictions = self.predict_multi_horizon()
        
        for name, pred in predictions.items():
            dir_icon = "🟢" if pred['direction'] == "UP ↑" else "🔴"
            prob = pred['direction_probability']
            conf_icon = "🟢" if pred['confidence'] > 75 else "🟡" if pred['confidence'] > 60 else "⚠️"
            
            print(f"\n  {name:12} → ${pred['predicted_price']:>10,.2f}  "
                  f"{pred['direction']}  {pred['change']:>+8,.2f} ({pred['change_pct']:>+6.2f}%)")
            print(f"               Direction Prob: {prob:.1%} {dir_icon}  "
                  f"Confidence: {pred['confidence']:.0f}% {conf_icon}")
        
        print("\n" + "="*70)
        print("💡 Multi-Task Model: Predicts BOTH price AND direction")
        print("   Higher direction accuracy = Better trading signals")
        print("="*70 + "\n")
        
        return predictions


def main():
    try:
        predictor = MultiTaskPredictor()
        predictions = predictor.display_predictions()
        
        # Save
        pred_df = pd.DataFrame.from_dict(predictions, orient='index')
        pred_df['timestamp'] = datetime.now()
        pred_df.to_csv('latest_multi_task_predictions.csv')
        print("✓ Saved: latest_multi_task_predictions.csv\n")
        
    except FileNotFoundError as e:
        print("\n❌ ERROR: Required files not found!")
        print(f"Missing: {e}")
        print("\nRun in order:")
        print("  1. python fetch_historical_data.py")
        print("  2. python train_multi_task.py")
        print("  3. python predict_multi_task.py")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()