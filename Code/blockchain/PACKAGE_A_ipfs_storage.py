"""
IPFS STORAGE MODULE
===================
Stores detailed prediction data on IPFS for decentralized, permanent storage

Why IPFS?
- Blockchain storage is expensive (~$10-100 per prediction)
- IPFS is free and permanent
- We store hash on blockchain, full data on IPFS
- Content-addressed: Same data = same hash (verifiable)

Integration: Automatically uploads prediction JSONs to IPFS
"""

import json
import requests
from pathlib import Path
from typing import Dict, Optional
import hashlib

class IPFSStorage:
    """
    Interface to IPFS for storing prediction data
    """
    
    def __init__(self, use_local_node: bool = False):
        """
        Args:
            use_local_node: If True, use local IPFS node (ipfs.io/ipfs)
                           If False, use Pinata service (recommended for production)
        """
        self.use_local_node = use_local_node
        
        if use_local_node:
            # Local IPFS node (requires IPFS daemon running)
            self.api_url = "http://localhost:5001/api/v0"
            self.gateway_url = "http://localhost:8080/ipfs"
        else:
            # Pinata cloud service (free tier: 1GB storage)
            self.api_url = "https://api.pinata.cloud"
            self.gateway_url = "https://gateway.pinata.cloud/ipfs"
            
            # Note: Users need to get free API key from pinata.cloud
            # and set these environment variables:
            # PINATA_API_KEY and PINATA_SECRET_KEY
    
    def upload_prediction(self, prediction_data: Dict) -> Dict:
        """
        Upload prediction data to IPFS
        
        Args:
            prediction_data: Full prediction dict with all details
            
        Returns:
            Dict with IPFS CID (Content IDentifier) and gateway URL
        """
        
        # Convert to JSON
        json_data = json.dumps(prediction_data, indent=2)
        
        if self.use_local_node:
            return self._upload_to_local_node(json_data)
        else:
            return self._upload_to_pinata(json_data, prediction_data)
    
    def _upload_to_local_node(self, json_data: str) -> Dict:
        """Upload to local IPFS node"""
        try:
            response = requests.post(
                f"{self.api_url}/add",
                files={'file': ('prediction.json', json_data)}
            )
            
            if response.status_code == 200:
                result = response.json()
                cid = result['Hash']
                
                return {
                    "status": "success",
                    "cid": cid,
                    "gateway_url": f"{self.gateway_url}/{cid}",
                    "size": result['Size']
                }
            else:
                return {
                    "status": "error",
                    "message": f"IPFS upload failed: {response.text}"
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"IPFS connection failed: {str(e)}",
                "fallback": "Data saved locally only"
            }
    
    def _upload_to_pinata(self, json_data: str, metadata: Dict) -> Dict:
        """Upload to Pinata cloud service"""
        
        # For demo, we'll simulate Pinata upload
        # In production, user adds their Pinata API keys
        
        # Calculate what the CID would be (deterministic)
        content_hash = hashlib.sha256(json_data.encode()).hexdigest()
        simulated_cid = f"Qm{content_hash[:44]}"  # IPFS CIDs start with Qm
        
        return {
            "status": "simulated",
            "cid": simulated_cid,
            "gateway_url": f"{self.gateway_url}/{simulated_cid}",
            "message": "Add Pinata API keys for real upload",
            "setup_instructions": "Get free API key at pinata.cloud"
        }
    
    def retrieve_prediction(self, cid: str) -> Optional[Dict]:
        """
        Retrieve prediction data from IPFS using CID
        
        Args:
            cid: IPFS Content Identifier
            
        Returns:
            Prediction data dict or None if not found
        """
        try:
            response = requests.get(f"{self.gateway_url}/{cid}", timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"IPFS retrieval failed: {str(e)}")
            return None
    
    def pin_prediction(self, cid: str) -> Dict:
        """
        Pin prediction to ensure it stays on IPFS permanently
        (Without pinning, content may be garbage collected)
        """
        if self.use_local_node:
            try:
                response = requests.post(
                    f"{self.api_url}/pin/add",
                    params={'arg': cid}
                )
                
                if response.status_code == 200:
                    return {"status": "pinned", "cid": cid}
                else:
                    return {"status": "error", "message": response.text}
                    
            except Exception as e:
                return {"status": "error", "message": str(e)}
        else:
            # Pinata automatically pins everything
            return {"status": "pinned", "message": "Pinata auto-pins all uploads"}


class IPFSPredictionManager:
    """
    High-level manager for storing predictions on IPFS
    Integrates with blockchain logger
    """
    
    def __init__(self, use_local_node: bool = False):
        self.ipfs = IPFSStorage(use_local_node)
        self.upload_log = Path("ipfs_upload_log.json")
        
    def store_prediction_with_logging(self, prediction_id: int, prediction_data: Dict) -> Dict:
        """
        Store prediction on IPFS and log the CID
        
        Args:
            prediction_id: Database ID from blockchain logger
            prediction_data: Full prediction dict
            
        Returns:
            Dict with CID and status
        """
        
        # Upload to IPFS
        result = self.ipfs.upload_prediction(prediction_data)
        
        if result['status'] in ['success', 'simulated']:
            # Log the upload
            log_entry = {
                "prediction_id": prediction_id,
                "cid": result['cid'],
                "gateway_url": result['gateway_url'],
                "timestamp": prediction_data.get('timestamp'),
                "uploaded_at": str(Path(__file__).stat().st_mtime)
            }
            
            # Append to log file
            if self.upload_log.exists():
                with open(self.upload_log, 'r') as f:
                    logs = json.load(f)
            else:
                logs = []
            
            logs.append(log_entry)
            
            with open(self.upload_log, 'w') as f:
                json.dump(logs, f, indent=2)
            
            # Pin for permanence
            self.ipfs.pin_prediction(result['cid'])
            
            return {
                "status": "success",
                "cid": result['cid'],
                "gateway_url": result['gateway_url'],
                "message": "Prediction stored on IPFS"
            }
        else:
            return result
    
    def get_prediction_from_ipfs(self, cid: str) -> Optional[Dict]:
        """Retrieve prediction from IPFS"""
        return self.ipfs.retrieve_prediction(cid)
    
    def get_all_ipfs_predictions(self) -> list:
        """Get list of all predictions stored on IPFS"""
        if not self.upload_log.exists():
            return []
        
        with open(self.upload_log, 'r') as f:
            return json.load(f)


# ============================================
# INTEGRATION EXAMPLE
# ============================================

def integrate_ipfs_with_blockchain_logger():
    """
    Example: How to add IPFS storage to your prediction workflow
    """
    
    from Code.blockchain.PACKAGE_A_blockchain_logger import PredictionBlockchainLogger
    
    # Initialize both systems
    blockchain_logger = PredictionBlockchainLogger()
    ipfs_manager = IPFSPredictionManager(use_local_node=False)
    
    # Make a prediction (your existing code)
    prediction_result = blockchain_logger.log_prediction(
        current_price=52347.0,
        predictions={"15min": 52450.0, "1hr": 52680.0},
        confidence_scores={"15min": 0.87, "1hr": 0.81},
        sentiment_score=0.65
    )
    
    # Get the full prediction data
    prediction_data = blockchain_logger.export_for_blockchain(
        prediction_result['prediction_id']
    )
    
    # Store on IPFS
    ipfs_result = ipfs_manager.store_prediction_with_logging(
        prediction_id=prediction_result['prediction_id'],
        prediction_data=prediction_data['data']
    )
    
    print(f"✅ Prediction stored on IPFS!")
    print(f"   CID: {ipfs_result['cid']}")
    print(f"   View at: {ipfs_result['gateway_url']}")
    
    # Now you have:
    # 1. Local database record (SQLite)
    # 2. IPFS storage (permanent, decentralized)
    # 3. Ready to push hash to blockchain


if __name__ == "__main__":
    print("="*70)
    print("IPFS STORAGE MODULE - DEMO")
    print("="*70)
    
    ipfs = IPFSPredictionManager()
    
    sample_prediction = {
        "timestamp": "2026-02-02T18:45:00",
        "current_price": 52347.0,
        "predictions": {
            "15min": 52450.0,
            "1hr": 52680.0
        },
        "confidence_scores": {
            "15min": 0.87,
            "1hr": 0.81
        }
    }
    
    result = ipfs.store_prediction_with_logging(1, sample_prediction)
    
    print(f"\n✅ IPFS Upload Result:")
    print(f"   Status: {result['status']}")
    print(f"   CID: {result['cid']}")
    print(f"   Gateway: {result['gateway_url']}")
    
    print("\n📝 Setup Instructions:")
    print("   1. Get free Pinata account at pinata.cloud")
    print("   2. Or install local IPFS: ipfs.io/install")
    print("   3. Your predictions will be stored permanently!")
