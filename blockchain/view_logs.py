"""
VIEW BLOCKCHAIN LOGS
====================
Simple script to view your blockchain-logged predictions

Usage:
    python view_logs.py                  # View all predictions
    python view_logs.py --recent 10      # View last 10 predictions
    python view_logs.py --unverified     # View unverified predictions
    python view_logs.py --stats          # View performance statistics
    python view_logs.py --export         # Export to CSV
"""

import sys
import sqlite3
from pathlib import Path
import json
from datetime import datetime
import pandas as pd
from typing import Optional


class BlockchainLogViewer:
    """
    View and analyze blockchain-logged predictions
    """
    
    def __init__(self, db_path: str = "prediction_verification.db"):
        self.db_path = db_path
        
        if not Path(db_path).exists():
            print(f"❌ Database not found: {db_path}")
            print("   Have you run the prediction system with blockchain logging enabled?")
            sys.exit(1)
    
    def view_all_predictions(self, limit: Optional[int] = None):
        """View all predictions"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT 
                id,
                prediction_hash,
                timestamp,
                current_price,
                horizons,
                predicted_values,
                confidence_scores,
                sentiment_score,
                verified,
                ipfs_cid,
                blockchain_tx
            FROM predictions
            ORDER BY created_at DESC
        '''
        
        if limit:
            query += f' LIMIT {limit}'
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if df.empty:
            print("No predictions found.")
            return
        
        print("="*100)
        print("BLOCKCHAIN-LOGGED PREDICTIONS")
        print("="*100)
        
        for idx, row in df.iterrows():
            print(f"\n{'='*100}")
            print(f"Prediction #{row['id']}")
            print(f"{'='*100}")
            
            print(f"🔐 Hash: {row['prediction_hash'][:32]}...")
            print(f"📅 Time: {row['timestamp']}")
            print(f"💰 Current Price: ${row['current_price']:,.2f}")
            
            # Parse horizons and predictions
            horizons = json.loads(row['horizons'])
            predictions = json.loads(row['predicted_values'])
            confidences = json.loads(row['confidence_scores'])
            
            print(f"\n🎯 Predictions:")
            for h, p, c in zip(horizons, predictions, confidences):
                change = p - row['current_price']
                change_pct = (change / row['current_price']) * 100
                direction = "📈" if change > 0 else "📉"
                
                print(f"   {h:8} → ${p:,.2f}  {direction} {change:+.2f} ({change_pct:+.2f}%)  [Confidence: {c:.2%}]")
            
            if row['sentiment_score']:
                print(f"\n💭 Sentiment: {row['sentiment_score']:.4f}")
            
            print(f"\n📊 Status: {'✅ Verified' if row['verified'] else '⏳ Pending Verification'}")
            
            if row['ipfs_cid']:
                print(f"☁️  IPFS: https://gateway.pinata.cloud/ipfs/{row['ipfs_cid']}")
            
            if row['blockchain_tx']:
                print(f"⛓️  Blockchain: https://sepolia.etherscan.io/tx/{row['blockchain_tx']}")
        
        print(f"\n{'='*100}")
        print(f"Total Predictions: {len(df)}")
        print(f"Verified: {df['verified'].sum()}")
        print(f"Pending: {len(df) - df['verified'].sum()}")
        print(f"{'='*100}")
    
    def view_unverified(self):
        """View predictions that haven't been verified yet"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT 
                id,
                prediction_hash,
                timestamp,
                current_price,
                horizons,
                predicted_values,
                confidence_scores
            FROM predictions
            WHERE verified = 0
            ORDER BY created_at DESC
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if df.empty:
            print("✅ All predictions have been verified!")
            return
        
        print("="*100)
        print("UNVERIFIED PREDICTIONS (Need Actual Price Data)")
        print("="*100)
        
        for idx, row in df.iterrows():
            pred_time = datetime.fromisoformat(row['timestamp'])
            hours_ago = (datetime.utcnow() - pred_time).total_seconds() / 3600
            
            print(f"\nPrediction #{row['id']} - Made {hours_ago:.1f} hours ago")
            print(f"   Hash: {row['prediction_hash'][:32]}...")
            print(f"   Time: {row['timestamp']}")
            
            horizons = json.loads(row['horizons'])
            print(f"   Horizons: {', '.join(horizons)}")
            
            # Check which horizons are ready for verification
            ready_horizons = []
            for h in horizons:
                if 'min' in h:
                    mins = int(h.replace('min', ''))
                    if hours_ago * 60 >= mins:
                        ready_horizons.append(h)
                elif 'hr' in h:
                    hrs = int(h.replace('hr', ''))
                    if hours_ago >= hrs:
                        ready_horizons.append(h)
                elif 'day' in h:
                    days = int(h.replace('day', ''))
                    if hours_ago >= days * 24:
                        ready_horizons.append(h)
            
            if ready_horizons:
                print(f"   ✅ Ready to verify: {', '.join(ready_horizons)}")
            else:
                print(f"   ⏳ Not ready yet (too soon)")
        
        print(f"\n{'='*100}")
        print(f"Total Unverified: {len(df)}")
        print(f"{'='*100}")
    
    def view_statistics(self):
        """View performance statistics"""
        conn = sqlite3.connect(self.db_path)
        
        # Get verification stats
        query = '''
            SELECT 
                vr.horizon,
                AVG(vr.error_percentage) as avg_error,
                AVG(CASE WHEN vr.direction_correct = 1 THEN 100 ELSE 0 END) as direction_accuracy,
                COUNT(*) as total_predictions
            FROM verification_results vr
            JOIN predictions p ON vr.prediction_id = p.id
            GROUP BY vr.horizon
            ORDER BY 
                CASE 
                    WHEN vr.horizon LIKE '%min' THEN 1
                    WHEN vr.horizon LIKE '%hr' THEN 2
                    WHEN vr.horizon LIKE '%day' THEN 3
                    ELSE 4
                END,
                CAST(SUBSTR(vr.horizon, 1, INSTR(vr.horizon, CASE 
                    WHEN vr.horizon LIKE '%min' THEN 'min'
                    WHEN vr.horizon LIKE '%hr' THEN 'hr'
                    WHEN vr.horizon LIKE '%day' THEN 'day'
                END) - 1) AS INTEGER)
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if df.empty:
            print("No verified predictions yet. Run the system for a while!")
            return
        
        print("="*100)
        print("PERFORMANCE STATISTICS")
        print("="*100)
        
        print(f"\n{'Horizon':<12} {'Avg Error':<12} {'Direction Acc':<15} {'Total Predictions'}")
        print(f"{'-'*12} {'-'*12} {'-'*15} {'-'*17}")
        
        for _, row in df.iterrows():
            print(f"{row['horizon']:<12} {row['avg_error']:>10.2f}% {row['direction_accuracy']:>13.1f}% {row['total_predictions']:>17}")
        
        # Overall stats
        total_preds = df['total_predictions'].sum()
        weighted_error = (df['avg_error'] * df['total_predictions']).sum() / total_preds
        weighted_dir_acc = (df['direction_accuracy'] * df['total_predictions']).sum() / total_preds
        
        print(f"\n{'='*100}")
        print(f"OVERALL PERFORMANCE:")
        print(f"   Total Verified Predictions: {total_preds}")
        print(f"   Average Error: {weighted_error:.2f}%")
        print(f"   Direction Accuracy: {weighted_dir_acc:.1f}%")
        print(f"{'='*100}")
    
    def export_to_csv(self, output_file: str = "prediction_history.csv"):
        """Export all predictions to CSV"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT 
                id,
                prediction_hash,
                timestamp,
                current_price,
                horizons,
                predicted_values,
                confidence_scores,
                sentiment_score,
                verified,
                ipfs_cid,
                blockchain_tx
            FROM predictions
            ORDER BY created_at DESC
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        df.to_csv(output_file, index=False)
        
        print(f"✅ Exported {len(df)} predictions to {output_file}")


def main():
    """Main entry point"""
    
    viewer = BlockchainLogViewer()
    
    if len(sys.argv) == 1:
        # No arguments - show all predictions
        viewer.view_all_predictions()
        return
    
    command = sys.argv[1].lower()
    
    if command == "--recent":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        viewer.view_all_predictions(limit=limit)
    
    elif command == "--unverified":
        viewer.view_unverified()
    
    elif command == "--stats":
        viewer.view_statistics()
    
    elif command == "--export":
        output_file = sys.argv[2] if len(sys.argv) > 2 else "prediction_history.csv"
        viewer.export_to_csv(output_file)
    
    elif command == "--help":
        print("""
VIEW BLOCKCHAIN LOGS
====================

Usage:
    python view_logs.py                  # View all predictions
    python view_logs.py --recent 10      # View last 10 predictions
    python view_logs.py --unverified     # View unverified predictions
    python view_logs.py --stats          # View performance statistics
    python view_logs.py --export [file]  # Export to CSV
    python view_logs.py --help           # Show this help
        """)
    
    else:
        print(f"Unknown command: {command}")
        print("Use --help for usage information")


if __name__ == "__main__":
    main()
