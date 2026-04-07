"""
Merge Sentiment and Price Data
Combines bitcoin_sentiment_history.csv + btc_live_updated.csv
Adds sentiment features to price data
"""

import pandas as pd
import numpy as np
from datetime import datetime

def merge_sentiment_and_price(
    price_csv="btc_live_updated.csv",
    sentiment_csv="bitcoin_sentiment_history.csv",
    historical_csv="btc_unified_data.csv",
    output_csv="btc_unified_data.csv"
):
    """
    Merge sentiment and price data
    Combines historical data with new continuous collector data
    """
    
    print("="*60)
    print("MERGING SENTIMENT + PRICE DATA")
    print("="*60)
    
    # Load historical data if exists
    print("\n1. Loading existing unified data...")
    historical_df = None
    try:
        if pd.io.common.file_exists(historical_csv):
            historical_df = pd.read_csv(historical_csv)
            historical_df['time'] = pd.to_datetime(historical_df['time'])
            print(f"   ✓ {len(historical_df)} historical records")
            print(f"   Range: {historical_df['time'].min()} to {historical_df['time'].max()}")
        else:
            print(f"   ⚠ No historical file found. Will create new.")
    except Exception as e:
        print(f"   ⚠ Error loading historical: {e}")
    
    # Load new price data
    print("\n2. Loading new price data...")
    price_df = None
    try:
        if pd.io.common.file_exists(price_csv):
            price_df = pd.read_csv(price_csv)
            price_df['time'] = pd.to_datetime(price_df['time'])
            print(f"   ✓ {len(price_df)} new price records")
            print(f"   Range: {price_df['time'].min()} to {price_df['time'].max()}")
        else:
            print(f"   ⚠ No new price data")
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # Load sentiment data
    print("\n3. Loading sentiment data...")
    sentiment_df = None
    try:
        if pd.io.common.file_exists(sentiment_csv):
            sentiment_df = pd.read_csv(sentiment_csv)
            sentiment_df['timestamp'] = pd.to_datetime(sentiment_df['timestamp'])
            print(f"   ✓ {len(sentiment_df)} sentiment records")
        else:
            print("   ⚠ No sentiment file. Will use price-based sentiment...")
    except Exception as e:
        print(f"   ⚠ Error: {e}")
    
    # Decide what to merge
    if price_df is None and historical_df is None:
        print("\n✗ ERROR: No data available!")
        return None
    
    # Case 1: Only historical data (first run after fetch_historical_data.py)
    if price_df is None and historical_df is not None:
        print("\n4. Using historical data only...")
        final_df = historical_df
    
    # Case 2: Only new price data (no historical yet)
    elif price_df is not None and historical_df is None:
        print("\n4. Processing new price data...")
        
        # Add hour column for sentiment aggregation
        price_df['hour'] = price_df['time'].dt.floor('H')
        
        # Aggregate sentiment if available
        if sentiment_df is not None:
            sentiment_df['hour'] = sentiment_df['timestamp'].dt.floor('H')
            
            hourly_sentiment = sentiment_df.groupby('hour').agg({
                'sentiment_score': ['mean', 'std', 'min', 'max', 'count'],
                'relevance_score': 'mean'
            }).reset_index()
            
            hourly_sentiment.columns = [
                'hour', 'sentiment_mean', 'sentiment_std', 'sentiment_min',
                'sentiment_max', 'news_count', 'relevance_mean'
            ]
            
            # Merge with price
            final_df = pd.merge(price_df, hourly_sentiment, on='hour', how='left')
        else:
            final_df = price_df
            # Add empty sentiment columns
            final_df['sentiment_mean'] = 0
            final_df['sentiment_std'] = 0
            final_df['sentiment_min'] = 0
            final_df['sentiment_max'] = 0
            final_df['news_count'] = 0
            final_df['relevance_mean'] = 0.5
        
        final_df = final_df.drop('hour', axis=1)
    
    # Case 3: BOTH historical and new data (CONTINUOUS UPDATE)
    else:
        print("\n4. Merging historical + new data...")
        
        # Get last date from historical
        last_historical_date = historical_df['time'].max()
        print(f"   Historical ends: {last_historical_date}")
        
        # Get new records only
        new_records = price_df[price_df['time'] > last_historical_date]
        
        if len(new_records) == 0:
            print(f"   ℹ No new records (continuous collector hasn't added data yet)")
            final_df = historical_df
        else:
            print(f"   ✓ Found {len(new_records)} new records")
            
            # Add hour for sentiment
            new_records['hour'] = new_records['time'].dt.floor('H')
            
            # Aggregate sentiment if available
            if sentiment_df is not None:
                sentiment_df['hour'] = sentiment_df['timestamp'].dt.floor('H')
                
                # Filter sentiment to new period only
                new_sentiment = sentiment_df[sentiment_df['timestamp'] > last_historical_date]
                
                if len(new_sentiment) > 0:
                    hourly_sentiment = new_sentiment.groupby('hour').agg({
                        'sentiment_score': ['mean', 'std', 'min', 'max', 'count'],
                        'relevance_score': 'mean'
                    }).reset_index()
                    
                    hourly_sentiment.columns = [
                        'hour', 'sentiment_mean', 'sentiment_std', 'sentiment_min',
                        'sentiment_max', 'news_count', 'relevance_mean'
                    ]
                    
                    new_records = pd.merge(new_records, hourly_sentiment, on='hour', how='left')
                else:
                    # No new sentiment, use neutral
                    for col in ['sentiment_mean', 'sentiment_std', 'sentiment_min', 
                               'sentiment_max', 'news_count', 'relevance_mean']:
                        if col not in new_records.columns:
                            new_records[col] = 0 if 'sentiment' in col or 'news' in col else 0.5
            else:
                # No sentiment data
                for col in ['sentiment_mean', 'sentiment_std', 'sentiment_min', 
                           'sentiment_max', 'news_count', 'relevance_mean']:
                    if col not in new_records.columns:
                        new_records[col] = 0 if 'sentiment' in col or 'news' in col else 0.5
            
            new_records = new_records.drop('hour', axis=1, errors='ignore')
            
            # Ensure same columns
            for col in historical_df.columns:
                if col not in new_records.columns:
                    new_records[col] = 0
            
            # Combine historical + new
            final_df = pd.concat([historical_df, new_records], ignore_index=True)
            final_df = final_df.sort_values('time').reset_index(drop=True)
            
            print(f"   ✓ Combined: {len(historical_df)} old + {len(new_records)} new = {len(final_df)} total")
    
    # Fill missing sentiment values
    print("\n5. Filling missing values...")
    for col in ['sentiment_mean', 'sentiment_std', 'sentiment_min', 
               'sentiment_max', 'news_count', 'relevance_mean']:
        if col in final_df.columns:
            if col == 'relevance_mean':
                final_df[col].fillna(0.5, inplace=True)
            else:
                final_df[col].fillna(0, inplace=True)
    
    # Add sentiment features (only if not already present)
    print("\n6. Engineering sentiment features...")
    
    if 'sentiment_momentum_1h' not in final_df.columns:
        # Sentiment momentum
        final_df['sentiment_momentum_1h'] = final_df['sentiment_mean'].diff(1)
        final_df['sentiment_momentum_6h'] = final_df['sentiment_mean'].diff(6)
        final_df['sentiment_momentum_24h'] = final_df['sentiment_mean'].diff(24)
        
        # Sentiment moving averages
        final_df['sentiment_ma_6h'] = final_df['sentiment_mean'].rolling(6).mean()
        final_df['sentiment_ma_24h'] = final_df['sentiment_mean'].rolling(24).mean()
        
        # Sentiment-price interaction
        final_df['sentiment_price_interaction'] = final_df['sentiment_mean'] * final_df['close']
        final_df['sentiment_volume_interaction'] = final_df['sentiment_mean'] * final_df['volume']
        
        # News volume features
        final_df['news_momentum'] = final_df['news_count'].diff(1)
        final_df['news_ma_6h'] = final_df['news_count'].rolling(6).mean()
        
        # Sentiment categories
        final_df['is_bullish'] = (final_df['sentiment_mean'] > 0.15).astype(int)
        final_df['is_bearish'] = (final_df['sentiment_mean'] < -0.15).astype(int)
        final_df['is_neutral'] = ((final_df['sentiment_mean'] >= -0.15) & 
                                 (final_df['sentiment_mean'] <= 0.15)).astype(int)
    
    # Fill NaN
    final_df = final_df.fillna(method='ffill').fillna(0)
    
    # Remove duplicates
    final_df = final_df.drop_duplicates(subset=['time'], keep='last')
    
    # Save
    print(f"\n7. Saving unified dataset...")
    final_df.to_csv(output_csv, index=False)
    
    print(f"\n✓ MERGE COMPLETE!")
    print(f"  Total records: {len(final_df)}")
    print(f"  Features: {len(final_df.columns)}")
    print(f"  Date range: {final_df['time'].min()} to {final_df['time'].max()}")
    print(f"  Saved to: {output_csv}")
    
    # Feature summary
    sentiment_cols = [c for c in final_df.columns if 'sentiment' in c or 'news' in c or 'bullish' in c or 'bearish' in c]
    print(f"\n📊 Feature Summary:")
    print(f"  Total features: {len(final_df.columns)}")
    print(f"  Sentiment features: {len(sentiment_cols)}")
    if 'sentiment_mean' in final_df.columns:
        print(f"  Avg sentiment: {final_df['sentiment_mean'].mean():.4f}")
        print(f"  Bullish records: {final_df['is_bullish'].sum() if 'is_bullish' in final_df.columns else 0}")
        print(f"  Bearish records: {final_df['is_bearish'].sum() if 'is_bearish' in final_df.columns else 0}")
    
    return final_df


if __name__ == "__main__":
    df = merge_sentiment_and_price()
    
    if df is not None:
        print("\n" + "="*60)
        print("✓ Ready for unified transformer training!")
        print("  Run: python unified_transformer_model.py")
        print("="*60)