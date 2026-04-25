import React, { useEffect, useState } from 'react';
import { Shield, Link as LinkIcon, ExternalLink, Cpu, HardDrive, CheckCircle2, RefreshCw } from 'lucide-react';
import { mlPredictionService, BlockchainLog } from '../../services/mlPredictionService';

export const BlockchainVerification: React.FC = () => {
    const [logs, setLogs] = useState<BlockchainLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchLogs = async () => {
            try {
                const data = await mlPredictionService.getBlockchainLogs();
                if (mounted) {
                    setLogs(data);
                    setLoading(false);
                    setLastRefresh(new Date());
                }
            } catch (e) {
                if (mounted) setLoading(false);
            }
        };

        fetchLogs();

        // Poll every 10 seconds for new on-chain verifications
        const interval = setInterval(() => {
            if (autoRefreshEnabled) {
                fetchLogs();
            }
        }, 10000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [autoRefreshEnabled]);

    const handleManualRefresh = async () => {
        setLoading(true);
        try {
            const data = await mlPredictionService.getBlockchainLogs();
            setLogs(data);
            setLastRefresh(new Date());
        } finally {
            setLoading(false);
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mt-6 animate-pulse">
                <div className="h-6 w-1/3 bg-gray-700 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-20 bg-gray-700 rounded w-full"></div>
                    <div className="h-20 bg-gray-700 rounded w-full"></div>
                </div>
            </div>
        );
    }

    if (logs.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mt-6 shadow-lg shadow-green-900/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-400" />
                        Blockchain Verification Engine
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Real-time immutable proofs of ML predictions
                        {lastRefresh && (
                            <span className="ml-2 text-gray-500">
                                • Last updated: {lastRefresh.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                            autoRefreshEnabled
                                ? 'bg-green-900/30 text-green-400 border-green-800/50'
                                : 'bg-gray-900/30 text-gray-400 border-gray-800/50'
                        }`}
                    >
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                        }`}></span>
                        {autoRefreshEnabled ? 'Live' : 'Paused'}
                    </button>
                    <button
                        onClick={handleManualRefresh}
                        disabled={loading}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh logs"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {logs.slice(0, 3).map((log, index) => (
                    <div 
                        key={`${log.hash}-${index}`} 
                        className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-green-500/30 transition-colors animate-in fade-in slide-in-from-top duration-300"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-medium text-gray-200">
                                    {new Date(log.timestamp).toLocaleString()}
                                </span>
                                <span className="text-xs text-green-400 font-mono bg-green-900/30 px-2 py-0.5 rounded">
                                    ✓ Verified
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500 block mb-0.5">BTC Price</span>
                                <span className="text-sm font-medium text-white">${log.price.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* SHA-256 Hash */}
                            <div className="bg-gray-800/80 rounded p-2.5 flex flex-col justify-center">
                                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                                    <Cpu className="w-3 h-3" />
                                    SHA-256 Hash
                                </div>
                                <div className="text-xs text-blue-400 font-mono truncate" title={log.hash}>
                                    {log.hash.substring(0, 16)}...{log.hash.substring(log.hash.length - 8)}
                                </div>
                            </div>

                            {/* IPFS CID */}
                            <div className="bg-gray-800/80 rounded p-2.5 flex flex-col justify-center">
                                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                                    <HardDrive className="w-3 h-3" />
                                    IPFS Content ID
                                </div>
                                <div className="text-xs text-purple-400 font-mono truncate" title={log.ipfs_cid}>
                                    <a href={`https://ipfs.io/ipfs/${log.ipfs_cid}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                        {log.ipfs_cid.substring(0, 8)}...{log.ipfs_cid.substring(log.ipfs_cid.length - 8)}
                                        <ExternalLink className="w-3 h-3 text-gray-500" />
                                    </a>
                                </div>
                            </div>

                            {/* Tx Hash */}
                            <div className="bg-gray-800/80 rounded p-2.5 flex flex-col justify-center border-l-2 border-green-500/50">
                                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                                    <LinkIcon className="w-3 h-3" />
                                    Transaction Hash
                                </div>
                                <div className="text-xs text-green-400 font-mono truncate" title={log.tx_hash}>
                                    {log.tx_hash.substring(0, 10)}...{log.tx_hash.substring(log.tx_hash.length - 8)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BlockchainVerification;
