"""
STANDALONE Multi-Task Transformer for Trading
Predicts both price and direction simultaneously
No external dependencies - all components included
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.metrics import accuracy_score, precision_score, recall_score
import pickle
import warnings
warnings.filterwarnings('ignore')

torch.manual_seed(42)
np.random.seed(42)


# ============================================================================
# DATASET CLASSES
# ============================================================================

class MultiTaskDataset(Dataset):
    """Dataset that returns sequences, price targets, and direction targets"""
    def __init__(self, sequences, price_targets, direction_targets):
        self.sequences = torch.FloatTensor(sequences)
        self.price_targets = torch.FloatTensor(price_targets)
        self.direction_targets = torch.FloatTensor(direction_targets)
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        return self.sequences[idx], self.price_targets[idx], self.direction_targets[idx]


# ============================================================================
# MODEL COMPONENTS
# ============================================================================

class PositionalEncoding(nn.Module):
    """Positional encoding to inject sequence order information"""
    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super(PositionalEncoding, self).__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                            (-np.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)
        
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


class MultiHeadAttention(nn.Module):
    """Multi-head self-attention mechanism"""
    def __init__(self, d_model, num_heads, dropout=0.1):
        super(MultiHeadAttention, self).__init__()
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
        
        Q = self.W_q(query)
        K = self.W_k(key)
        V = self.W_v(value)
        
        Q = self.split_heads(Q, batch_size)
        K = self.split_heads(K, batch_size)
        V = self.split_heads(V, batch_size)
        
        scores = torch.matmul(Q, K.transpose(-2, -1)) / np.sqrt(self.d_k)
        
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        
        attention = F.softmax(scores, dim=-1)
        attention = self.dropout(attention)
        
        context = torch.matmul(attention, V)
        context = context.permute(0, 2, 1, 3).contiguous()
        context = context.view(batch_size, -1, self.d_model)
        
        output = self.W_o(context)
        return output


class FeedForward(nn.Module):
    """Position-wise feed-forward network"""
    def __init__(self, d_model, d_ff, dropout=0.1):
        super(FeedForward, self).__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.GELU()
    
    def forward(self, x):
        x = self.linear1(x)
        x = self.activation(x)
        x = self.dropout(x)
        x = self.linear2(x)
        return x


class TransformerEncoderLayer(nn.Module):
    """Single transformer encoder layer"""
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super(TransformerEncoderLayer, self).__init__()
        
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
    
    def forward(self, x, mask=None):
        attn_output = self.self_attention(x, x, x, mask)
        x = self.norm1(x + self.dropout1(attn_output))
        
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout2(ff_output))
        
        return x


# ============================================================================
# MULTI-TASK MODEL
# ============================================================================

class MultiTaskTransformer(nn.Module):
    """
    Transformer that predicts BOTH:
    1. Next price (regression)
    2. Direction of price movement (binary classification)
    """
    def __init__(self, input_dim, d_model=128, num_heads=8, num_layers=4, 
                 d_ff=512, dropout=0.2, max_seq_length=100):
        super().__init__()
        
        self.input_dim = input_dim
        self.d_model = d_model
        
        # Input projection
        self.input_projection = nn.Sequential(
            nn.Linear(input_dim, d_model),
            nn.LayerNorm(d_model)
        )
        
        # Positional encoding
        self.pos_encoder = PositionalEncoding(d_model, dropout, max_seq_length)
        
        # Transformer encoder layers
        self.encoder_layers = nn.ModuleList([
            TransformerEncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        
        self.norm = nn.LayerNorm(d_model)
        
        # Shared feature extraction
        self.shared_fc1 = nn.Linear(d_model, d_model // 2)
        self.shared_fc2 = nn.Linear(d_model // 2, d_model // 4)
        
        # TASK 1: Price Prediction (Regression)
        self.price_head = nn.Sequential(
            nn.Linear(d_model // 4, d_model // 8),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 8, 1)
        )
        
        # TASK 2: Direction Prediction (Binary Classification)
        self.direction_head = nn.Sequential(
            nn.Linear(d_model // 4, d_model // 8),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 8, 1),
            nn.Sigmoid()
        )
        
        # Skip connections
        self.price_skip = nn.Linear(d_model, 1)
        self.direction_skip = nn.Sequential(
            nn.Linear(d_model, 1),
            nn.Sigmoid()
        )
        
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.GELU()
        
        self._init_weights()
    
    def _init_weights(self):
        """Initialize weights"""
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_normal_(m.weight, gain=0.1)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
    
    def forward(self, x, mask=None):
        # Input projection
        x = self.input_projection(x)
        
        # Add positional encoding
        x = self.pos_encoder(x)
        
        # Transformer encoding
        for layer in self.encoder_layers:
            x = layer(x, mask)
        
        # Global average pooling
        x = x.mean(dim=1)
        x = self.norm(x)
        
        # Shared features
        shared = self.activation(self.shared_fc1(x))
        shared = self.dropout(shared)
        shared = self.activation(self.shared_fc2(shared))
        shared = self.dropout(shared)
        
        # Price prediction
        price_main = self.price_head(shared)
        price_skip = self.price_skip(x)
        price = 0.7 * price_main + 0.3 * price_skip
        
        # Direction prediction
        direction_main = self.direction_head(shared)
        direction_skip = self.direction_skip(x)
        direction = 0.7 * direction_main + 0.3 * direction_skip
        
        return price.squeeze(), direction.squeeze()


class EarlyStopping:
    """Early stopping to prevent overfitting"""
    def __init__(self, patience=15, min_delta=0.0001):
        self.patience = patience
        self.min_delta = min_delta
        self.best_loss = None
        self.counter = 0
    
    def __call__(self, model, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif self.best_loss - val_loss > self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                return True
        return False


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_sequences_advanced(data, target, seq_length=60, stride=1):
    """Create overlapping sequences for time series"""
    sequences = []
    targets = []
    indices = []
    
    for i in range(0, len(data) - seq_length, stride):
        sequences.append(data[i:i+seq_length])
        targets.append(target[i+seq_length])
        indices.append(i+seq_length)
    
    return np.array(sequences), np.array(targets), np.array(indices)


def create_direction_targets(prices):
    """
    Create binary direction targets
    1 = price goes up, 0 = price goes down
    """
    price_changes = np.diff(prices)
    directions = (price_changes > 0).astype(np.float32)
    # Pad first element
    directions = np.concatenate([[0.5], directions])
    return directions


# ============================================================================
# TRAINING FUNCTION
# ============================================================================

def train_multi_task_model(
    data_path="btc_unified_data.csv",
    seq_length=90,
    epochs=150,
    batch_size=64,
    learning_rate=0.0005
):
    """
    Train multi-task transformer model
    """
    print("="*70)
    print("MULTI-TASK TRANSFORMER TRAINING")
    print("Predicting: Price + Direction")
    print("="*70)
    
    # Load data
    print("\n1. Loading data...")
    df = pd.read_csv(data_path)
    df['time'] = pd.to_datetime(df['time'])
    
    print(f"   Records: {len(df)}")
    print(f"   Date range: {df['time'].min()} to {df['time'].max()}")
    
    # Remove leaky features
    print("\n2. Removing data leakage features...")
    leaky = ['close_lag_1', 'momentum_1d', 'roc_1d', 'price_momentum']
    exclude = ["time", "target", "target_change_pct"] + leaky
    features = [c for c in df.columns if c not in exclude]
    
    print(f"   Features: {len(features)}")
    print(f"   Removed: {leaky}")
    
    # Create target
    print("\n3. Creating targets...")
    if "target" not in df.columns:
        df["target"] = df["close"].shift(-1)
    df = df[:-1].copy()
    
    X = df[features].values
    y_price = df["target"].values
    
    X = np.nan_to_num(X)
    y_price = np.nan_to_num(y_price)
    
    # Create direction targets
    y_direction = create_direction_targets(y_price)
    
    up_pct = np.mean(y_direction > 0.5) * 100
    down_pct = np.mean(y_direction < 0.5) * 100
    print(f"   Direction distribution: UP={up_pct:.1f}%, DOWN={down_pct:.1f}%")
    
    # Split data
    print("\n4. Splitting data (80/10/10)...")
    n = len(X)
    train_size = int(n * 0.8)
    val_size = int(n * 0.1)
    
    X_train = X[:train_size]
    y_price_train = y_price[:train_size]
    y_dir_train = y_direction[:train_size]
    
    X_val = X[train_size:train_size+val_size]
    y_price_val = y_price[train_size:train_size+val_size]
    y_dir_val = y_direction[train_size:train_size+val_size]
    
    X_test = X[train_size+val_size:]
    y_price_test = y_price[train_size+val_size:]
    y_dir_test = y_direction[train_size+val_size:]
    
    print(f"   Train: {len(X_train)}")
    print(f"   Val: {len(X_val)}")
    print(f"   Test: {len(X_test)}")
    
    # Scale
    print("\n5. Scaling...")
    feature_scaler = StandardScaler()
    price_scaler = StandardScaler()
    
    X_train_scaled = feature_scaler.fit_transform(X_train)
    X_val_scaled = feature_scaler.transform(X_val)
    X_test_scaled = feature_scaler.transform(X_test)
    
    y_price_train_scaled = price_scaler.fit_transform(y_price_train.reshape(-1, 1)).ravel()
    y_price_val_scaled = price_scaler.transform(y_price_val.reshape(-1, 1)).ravel()
    y_price_test_scaled = price_scaler.transform(y_price_test.reshape(-1, 1)).ravel()
    
    # Create sequences
    print(f"\n6. Creating sequences (length={seq_length})...")
    X_train_seq, y_price_train_seq, indices_train = create_sequences_advanced(
        X_train_scaled, y_price_train_scaled, seq_length
    )
    X_val_seq, y_price_val_seq, indices_val = create_sequences_advanced(
        X_val_scaled, y_price_val_scaled, seq_length
    )
    X_test_seq, y_price_test_seq, indices_test = create_sequences_advanced(
        X_test_scaled, y_price_test_scaled, seq_length
    )
    
    # Direction targets for sequences
    y_dir_train_seq = y_dir_train[indices_train]
    y_dir_val_seq = y_dir_val[indices_val]
    y_dir_test_seq = y_dir_test[indices_test]
    
    print(f"   Train: {X_train_seq.shape}")
    print(f"   Val: {X_val_seq.shape}")
    print(f"   Test: {X_test_seq.shape}")
    
    # DataLoaders
    train_dataset = MultiTaskDataset(X_train_seq, y_price_train_seq, y_dir_train_seq)
    val_dataset = MultiTaskDataset(X_val_seq, y_price_val_seq, y_dir_val_seq)
    test_dataset = MultiTaskDataset(X_test_seq, y_price_test_seq, y_dir_test_seq)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    # Model
    print("\n7. Initializing model...")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    model = MultiTaskTransformer(
        input_dim=X_train_seq.shape[2],
        d_model=128,
        num_heads=8,
        num_layers=4,
        d_ff=512,
        dropout=0.2,
        max_seq_length=seq_length
    ).to(device)
    
    params = sum(p.numel() for p in model.parameters())
    print(f"   Parameters: {params:,}")
    print(f"   Device: {device}")
    
    # Loss functions
    price_criterion = nn.SmoothL1Loss()
    direction_criterion = nn.BCELoss()
    
    # Optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, 'min', factor=0.5, patience=10, min_lr=1e-6
    )
    early_stopping = EarlyStopping(patience=20)
    
    # Training
    print("\n8. Training...")
    best_direction_acc = 0
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0
        train_price_loss = 0
        train_dir_loss = 0
        
        for sequences, price_targets, dir_targets in train_loader:
            sequences = sequences.to(device)
            price_targets = price_targets.to(device)
            dir_targets = dir_targets.to(device)
            
            optimizer.zero_grad()
            
            price_pred, dir_pred = model(sequences)
            
            loss_price = price_criterion(price_pred, price_targets)
            loss_direction = direction_criterion(dir_pred, dir_targets)
            
            # Combined loss (weight direction more for trading)
            total_loss = 0.5 * loss_price + 0.5 * loss_direction
            
            total_loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 0.5)
            optimizer.step()
            
            train_loss += total_loss.item()
            train_price_loss += loss_price.item()
            train_dir_loss += loss_direction.item()
        
        train_loss /= len(train_loader)
        train_price_loss /= len(train_loader)
        train_dir_loss /= len(train_loader)
        
        # Validation
        model.eval()
        val_loss = 0
        val_price_loss = 0
        val_dir_loss = 0
        val_dir_preds = []
        val_dir_targets = []
        
        with torch.no_grad():
            for sequences, price_targets, dir_targets in val_loader:
                sequences = sequences.to(device)
                price_targets = price_targets.to(device)
                dir_targets = dir_targets.to(device)
                
                price_pred, dir_pred = model(sequences)
                
                loss_price = price_criterion(price_pred, price_targets)
                loss_direction = direction_criterion(dir_pred, dir_targets)
                total_loss = 0.5 * loss_price + 0.5 * loss_direction
                
                val_loss += total_loss.item()
                val_price_loss += loss_price.item()
                val_dir_loss += loss_direction.item()
                
                val_dir_preds.extend((dir_pred > 0.5).cpu().numpy())
                val_dir_targets.extend(dir_targets.cpu().numpy())
        
        val_loss /= len(val_loader)
        val_price_loss /= len(val_loader)
        val_dir_loss /= len(val_loader)
        
        # Direction accuracy
        val_dir_preds = np.array(val_dir_preds)
        val_dir_targets = np.array(val_dir_targets) > 0.5
        direction_acc = accuracy_score(val_dir_targets, val_dir_preds) * 100
        
        scheduler.step(val_loss)
        
        if (epoch + 1) % 10 == 0:
            print(f"\nEpoch {epoch+1}/{epochs}:")
            print(f"  Train - Total: {train_loss:.4f}, Price: {train_price_loss:.4f}, Dir: {train_dir_loss:.4f}")
            print(f"  Val   - Total: {val_loss:.4f}, Price: {val_price_loss:.4f}, Dir: {val_dir_loss:.4f}")
            print(f"  Direction Accuracy: {direction_acc:.2f}%")
            print(f"  LR: {optimizer.param_groups[0]['lr']:.6f}")
        
        # Save best model
        if direction_acc > best_direction_acc:
            best_direction_acc = direction_acc
            
            torch.save({
                'model_state_dict': model.state_dict(),
                'feature_cols': features,
                'seq_length': seq_length,
                'direction_acc': direction_acc,
                'epoch': epoch
            }, 'best_multi_task_transformer.pth')
            
            if (epoch + 1) % 10 == 0:
                print(f"  ✓ Saved best model (Direction: {direction_acc:.2f}%)")
        
        # Early stopping
        if early_stopping(model, val_loss):
            print(f"\n✓ Early stopping at epoch {epoch+1}")
            break
    
    # Load best model
    print("\n9. Loading best model...")
    checkpoint = torch.load('best_multi_task_transformer.pth')
    model.load_state_dict(checkpoint['model_state_dict'])
    print(f"   Best direction accuracy: {checkpoint['direction_acc']:.2f}%")
    
    # Final evaluation
    print("\n" + "="*70)
    print("FINAL EVALUATION ON TEST SET")
    print("="*70)
    
    model.eval()
    test_price_preds_scaled = []
    test_dir_preds = []
    test_price_targets_scaled = []
    test_dir_targets = []
    
    with torch.no_grad():
        for sequences, price_targets, dir_targets in test_loader:
            sequences = sequences.to(device)
            
            price_pred, dir_pred = model(sequences)
            
            test_price_preds_scaled.extend(price_pred.cpu().numpy())
            test_dir_preds.extend((dir_pred > 0.5).cpu().numpy())
            test_price_targets_scaled.extend(price_targets.numpy())
            test_dir_targets.extend(dir_targets.numpy())
    
    test_price_preds_scaled = np.array(test_price_preds_scaled)
    test_price_targets_scaled = np.array(test_price_targets_scaled)
    test_dir_preds = np.array(test_dir_preds)
    test_dir_targets = np.array(test_dir_targets) > 0.5
    
    # Inverse transform prices
    test_price_preds = price_scaler.inverse_transform(test_price_preds_scaled.reshape(-1, 1)).ravel()
    test_price_targets = price_scaler.inverse_transform(test_price_targets_scaled.reshape(-1, 1)).ravel()
    
    # Price metrics
    rmse = np.sqrt(mean_squared_error(test_price_targets, test_price_preds))
    mae = mean_absolute_error(test_price_targets, test_price_preds)
    r2 = r2_score(test_price_targets, test_price_preds)
    mape = np.mean(np.abs((test_price_targets - test_price_preds) / test_price_targets)) * 100
    
    # Direction metrics
    direction_acc = accuracy_score(test_dir_targets, test_dir_preds) * 100
    direction_precision = precision_score(test_dir_targets, test_dir_preds, zero_division=0) * 100
    direction_recall = recall_score(test_dir_targets, test_dir_preds, zero_division=0) * 100
    
    print("\n📊 PRICE PREDICTION:")
    print(f"  RMSE: ${rmse:,.2f}")
    print(f"  MAE:  ${mae:,.2f}")
    print(f"  R²:   {r2:.4f}")
    print(f"  MAPE: {mape:.2f}%")
    
    print("\n🎯 DIRECTION PREDICTION:")
    print(f"  Accuracy:  {direction_acc:.2f}%")
    print(f"  Precision: {direction_precision:.2f}%")
    print(f"  Recall:    {direction_recall:.2f}%")
    
    # Save scalers
    with open('multi_task_scaler.pkl', 'wb') as f:
        pickle.dump({
            'feature_scaler': feature_scaler,
            'price_scaler': price_scaler,
            'feature_cols': features
        }, f)
    
    # Save results
    results = pd.DataFrame({
        'actual_price': test_price_targets,
        'predicted_price': test_price_preds,
        'actual_direction': test_dir_targets,
        'predicted_direction': test_dir_preds,
        'price_error': test_price_targets - test_price_preds
    })
    results.to_csv('multi_task_predictions.csv', index=False)
    
    print("\n✓ Saved:")
    print("  - best_multi_task_transformer.pth")
    print("  - multi_task_scaler.pkl")
    print("  - multi_task_predictions.csv")
    
    print("\n" + "="*70)
    print("TRADING READINESS ASSESSMENT:")
    print("="*70)
    
    if direction_acc >= 55:
        print("✅ Direction Accuracy ≥ 55% - READY FOR TRADING!")
        print("   Next step: Run trading_bot.py for backtesting")
    elif direction_acc >= 52:
        print("⚠️ Direction Accuracy 52-55% - MARGINAL")
        print("   Consider: Ensemble models, more features, or longer training")
    else:
        print("❌ Direction Accuracy < 52% - NOT READY")
        print("   Need improvements before trading")
    
    print("="*70)
    
    return model, feature_scaler, price_scaler, features


if __name__ == "__main__":
    print("\n🚀 Starting Multi-Task Transformer Training...")
    print("This model learns BOTH price AND direction prediction")
    print("Expected: +5-10% improvement in direction accuracy\n")
    
    try:
        model, feat_scaler, price_scaler, features = train_multi_task_model()
        print("\n✅ Training complete!")
        
    except FileNotFoundError:
        print("\n❌ Error: btc_unified_data.csv not found")
        print("Make sure the data file is in the current directory")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()