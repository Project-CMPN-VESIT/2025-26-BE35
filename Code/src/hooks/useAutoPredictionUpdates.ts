import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import predictionService from '@/services/predictionService';
import mlPredictionService from '@/services/mlPredictionService';
import { toast } from 'sonner';

export interface AutoUpdateConfig {
  enabled: boolean;
  intervalMinutes: number;
  autoLogToBlockchain: boolean;
}

export function useAutoPredictionUpdates(config: AutoUpdateConfig = { enabled: true, intervalMinutes: 15, autoLogToBlockchain: true }) {
  const {
    selectedSymbol,
    setPredictions,
    setPerformanceMetrics,
    currentPrice,
  } = useStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  const updatePredictions = useCallback(async () => {
    if (isRunningRef.current) {
      console.log('[AutoUpdate] Update already in progress, skipping');
      return;
    }

    isRunningRef.current = true;

    try {
      console.log(`[AutoUpdate] Updating predictions at ${new Date().toLocaleTimeString()}`);

      // Get new predictions
      const preds = await predictionService.generateAllPredictions(selectedSymbol);
      if (preds && preds.length > 0) {
        setPredictions(preds);

        // Update accuracy metrics
        await predictionService.updatePredictionAccuracy(selectedSymbol);
        setPerformanceMetrics(predictionService.getPerformanceMetrics());

        // Log to blockchain if enabled
        if (config.autoLogToBlockchain) {
          try {
            // Call the new blockchain logging endpoint
            const response = await fetch('http://localhost:5001/api/predictions/log-blockchain', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                predictions: preds,
                currentPrice: currentPrice,
                timestamp: new Date().toISOString(),
              }),
            });

            if (response.ok) {
              const result = await response.json();
              console.log('[AutoUpdate] Blockchain logging successful', result);
              toast.success(`✓ Predictions updated & logged to blockchain at ${new Date().toLocaleTimeString()}`);
            } else {
              console.warn('[AutoUpdate] Blockchain logging returned error status');
              toast.info('Predictions updated (blockchain logging pending)');
            }
          } catch (blockchainError) {
            console.warn('[AutoUpdate] Blockchain logging error:', blockchainError);
            // Still show success for prediction update
            toast.info('Predictions updated (blockchain connection unavailable)');
          }
        } else {
          toast.success(`✓ Predictions updated at ${new Date().toLocaleTimeString()}`);
        }
      }
    } catch (error) {
      console.error('[AutoUpdate] Error updating predictions:', error);
      toast.error('Failed to update predictions');
    } finally {
      isRunningRef.current = false;
    }
  }, [selectedSymbol, setPredictions, setPerformanceMetrics, currentPrice, config.autoLogToBlockchain]);

  // Setup/cleanup interval
  useEffect(() => {
    if (!config.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial update on mount
    updatePredictions();

    // Setup interval
    const intervalMs = config.intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(() => {
      updatePredictions();
    }, intervalMs);

    console.log(`[AutoUpdate] Initialized with ${config.intervalMinutes} minute intervals`);

    // Cleanup on unmount or config change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config.enabled, config.intervalMinutes, updatePredictions]);

  // Return function to manually trigger updates
  const triggerUpdate = useCallback(async () => {
    console.log('[AutoUpdate] Manual update triggered');
    await updatePredictions();
  }, [updatePredictions]);

  return {
    updatePredictions: triggerUpdate,
    isUpdating: isRunningRef.current,
  };
}

export default useAutoPredictionUpdates;
