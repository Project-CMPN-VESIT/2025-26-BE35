"""
Auto Model Updater for Multi-Task Transformer
"""

import pandas as pd
import numpy as np
import torch
import pickle
from datetime import datetime
import os

def incremental_update(
    data_path="btc_unified_data.csv",
    model_path="best_multi_task_transformer.pth",
    scaler_path="multi_task_scaler.pkl"
):
    print("="*60)
    print("AUTO MODEL UPDATER - MULTI-TASK")
    print(f"Time: {datetime.now()}")
    print("="*60)
    
    if not os.path.exists(model_path):
        print("\n⚠ Run: python train_multi_task.py first")
        return
    
    checkpoint = torch.load(model_path, weights_only=False)
    print(f"\n✓ Last trained epoch: {checkpoint['epoch']}")
    print(f"✓ Direction accuracy: {checkpoint['direction_acc']:.2f}%")
    
    df = pd.read_csv(data_path)
    df['time'] = pd.to_datetime(df['time'], format='mixed')
    last_date = checkpoint.get('last_trained_date', df['time'].min())
    if isinstance(last_date, str):
        last_date = pd.to_datetime(last_date, format='mixed')
    new_records = len(df[df['time'] > last_date])
    
    if new_records < 100:
        print(f"\n⚠ Only {new_records} new records (need 100+)")
        return
    
    print(f"\n✓ Found {new_records} new records - ready for update")
    print("✓ Logged to model_update_log.csv")
    
    with open('model_update_log.csv', 'a') as f:
        f.write(f"{datetime.now()},{new_records},pending\n")

if __name__ == "__main__":
    incremental_update()