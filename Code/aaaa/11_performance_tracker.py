"""
Model Performance Tracker - Multi-Task Version
Tracks BOTH price accuracy AND direction accuracy
"""

import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

def track_performance():
    print("="*60)
    print("MULTI-TASK PERFORMANCE TRACKER")
    print(f"Time: {datetime.now()}")
    print("="*60)
    
    try:
        # Load predictions
        df = pd.read_csv('multi_task_predictions.csv')
        
        print(f"\n📊 Analyzing {len(df)} predictions...")
        
        # Price metrics
        price_error = df['price_error'].abs().mean()
        price_rmse = np.sqrt((df['price_error'] ** 2).mean())
        
        # Direction metrics  
        dir_acc = accuracy_score(df['actual_direction'], df['predicted_direction']) * 100
        
        # When predicted UP, how often was it correct?
        up_preds = df[df['predicted_direction'] == True]
        if len(up_preds) > 0:
            up_accuracy = (up_preds['actual_direction'] == True).mean() * 100
        else:
            up_accuracy = 0
        
        # When predicted DOWN, how often was it correct?
        down_preds = df[df['predicted_direction'] == False]
        if len(down_preds) > 0:
            down_accuracy = (down_preds['actual_direction'] == False).mean() * 100
        else:
            down_accuracy = 0
        
        print(f"\n💰 PRICE PERFORMANCE:")
        print(f"  MAE:  ${price_error:,.2f}")
        print(f"  RMSE: ${price_rmse:,.2f}")
        
        print(f"\n🎯 DIRECTION PERFORMANCE:")
        print(f"  Overall Accuracy: {dir_acc:.2f}%")
        print(f"  UP Prediction Accuracy: {up_accuracy:.2f}%")
        print(f"  DOWN Prediction Accuracy: {down_accuracy:.2f}%")
        
        # Trading readiness
        print(f"\n📈 TRADING READINESS:")
        if dir_acc >= 55:
            print(f"  ✅ {dir_acc:.1f}% accuracy - READY FOR TRADING")
        elif dir_acc >= 52:
            print(f"  ⚠️ {dir_acc:.1f}% accuracy - MARGINAL")
        else:
            print(f"  ❌ {dir_acc:.1f}% accuracy - NOT READY")
        
        # Log performance
        with open('performance_log.csv', 'a') as f:
            f.write(f"{datetime.now()},{price_rmse},{dir_acc}\n")
        
        print("\n✓ Performance logged")
        
    except FileNotFoundError:
        print("\n⚠ No predictions file found")
        print("Run: python train_multi_task.py first")

if __name__ == "__main__":
    track_performance()