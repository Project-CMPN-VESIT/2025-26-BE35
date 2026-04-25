import argparse
import os
import importlib.util
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
from sklearn.metrics import accuracy_score

def load_sample_features(data_dir):
    import pandas as pd
    path = os.path.join(data_dir, 'real_1min_features.csv')
    if not os.path.exists(path):
        raise FileNotFoundError(f"Real features not found at {path}. Run 02_prep_micro_data.py first.")
    
    df = pd.read_csv(path)
    df = df.dropna()
    
    # Target: 1 if the next minute's close is higher than this minute's close
    df['target'] = (df['close'].shift(-1) > df['close']).astype(np.float32)
    df = df.dropna()
    
    # We drop timestamp and target from features to match input_dim=11
    feature_cols = ['open', 'high', 'low', 'close', 'volume', 'return', 'rsi', 'vol_mean', 'momentum', 'ema_9', 'ema_21']
    
    X = df[feature_cols].values.astype(np.float32)
    
    # Normalize features using Simple Z-Score scaling for stability
    X = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + 1e-8)
    
    y = df[['target']].values.astype(np.float32)
    return X, y

def train(args):
    # dynamic import of model file by path to avoid package name issues
    here = os.path.dirname(__file__)
    model_path = os.path.join(here, '05_micro_model_def.py')
    spec = importlib.util.spec_from_file_location('micro_model', model_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load 05_micro_model_def.py from {model_path}")
    micro_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(micro_mod)
    LightweightMicroModel = getattr(micro_mod, 'LightweightMicroModel')

    data_dir = os.path.join(here, 'data')
    X, y = load_sample_features(data_dir)
    
    # 80/20 Train-Validation Split for sequential time-series
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    train_dataset = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    val_dataset = TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val))
    
    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=128, shuffle=False)

    model = LightweightMicroModel(input_dim=11)
    device = torch.device('cuda' if torch.cuda.is_available() and args.use_gpu else 'cpu')
    model.to(device)

    criterion = nn.BCEWithLogitsLoss()
    optimizer = optim.AdamW(model.parameters(), lr=5e-4, weight_decay=1e-3)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'max', patience=5, factor=0.5)

    print("="*60)
    print(f"MICRO TRADER NEURAL NET TRAINING")
    print(f"Training on {len(X_train)} samples, Validating on {len(X_val)} samples.")
    print("="*60)

    best_val_acc = 0.0
    patience_counter = 0

    for epoch in range(args.epochs):
        # Training
        model.train()
        train_loss = 0.0
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            out = model(xb).squeeze(1)
            loss = criterion(out, yb.squeeze(1))
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * xb.size(0)
            
        train_loss_avg = train_loss / len(train_loader.dataset)
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_preds, val_targets = [], []
        
        with torch.no_grad():
            for xb, yb in val_loader:
                xb, yb = xb.to(device), yb.to(device)
                out = model(xb).squeeze(1)
                loss = criterion(out, yb.squeeze(1))
                val_loss += loss.item() * xb.size(0)
                
                probs = torch.sigmoid(out)
                val_preds.extend((probs > 0.5).cpu().numpy())
                val_targets.extend(yb.squeeze(1).cpu().numpy())
                
        val_loss_avg = val_loss / len(val_loader.dataset)
        val_acc = accuracy_score(val_targets, val_preds) * 100
        
        scheduler.step(val_acc)
        
        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"Epoch {epoch+1:03d}/{args.epochs} | Train Loss: {train_loss_avg:.4f} | Val Loss: {val_loss_avg:.4f} | Val Acc: {val_acc:.2f}%")
            
        # Checkpoint Saving & Early Stopping
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            os.makedirs(os.path.join(here, 'models'), exist_ok=True)
            torch.save(model.state_dict(), os.path.join(here, 'models', 'micro_model.pth'))
        else:
            patience_counter += 1
            
        if patience_counter >= args.patience:
            print(f"\nEarly stopping triggered at Epoch {epoch+1}.")
            break

    print("="*60)
    print(f"✅ Training Complete. Best Validation Accuracy: {best_val_acc:.2f}%")
    print("Model definitively saved to aaaa/models/micro_model.pth")
    print("="*60)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=50) # Increased dramatically to allow convergence
    parser.add_argument('--patience', type=int, default=15)
    parser.add_argument('--use-gpu', dest='use_gpu', action='store_true')
    parser.set_defaults(use_gpu=True) # Enabled GPU checking by default
    args = parser.parse_args()
    
    train(args)
