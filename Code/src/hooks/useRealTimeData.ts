import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import binanceService, { BinanceSymbol } from '@/services/binanceService';
import predictionService from '@/services/predictionService';
import sentimentService from '@/services/sentimentService';
import tradingService from '@/services/tradingService';
import securityService from '@/services/securityService';
import mlPredictionService from '@/services/mlPredictionService';
import { toast } from 'sonner';

export function useRealTimeData() {
  const {
    selectedSymbol,
    setCurrentPrice,
    setPriceStats,
    setChartData,
    setPredictions,
    setPerformanceMetrics,
    setSentiment,
    setNews,
    setPositions,
    setTrades,
    setBalance,
    setTradingStats,
    setAlerts,
    setTransactions,
    setAlertStats,
    setLoading,
    setError,
    setWsConnected,
    setLastUpdated,
    setMlAvailable,
    setMlModelInfo,
  } = useStore();

  const wsInitialized = useRef(false);

  // Check ML API health
  const checkMLHealth = useCallback(async () => {
    const status = await mlPredictionService.checkHealth();
    setMlAvailable(status.available);
    setMlModelInfo(status.available ? status : null);
  }, []);

  // Initialize all data
  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check ML API health in parallel with data loading
    checkMLHealth();

    try {
      // Fetch initial price stats
      const stats = await binanceService.get24hStats(selectedSymbol);
      if (stats) {
        setPriceStats(stats);
        setCurrentPrice(stats.currentPrice);
      }

      // Fetch historical chart data
      const klines = await binanceService.getKlines(selectedSymbol, '1h', 100);
      setChartData(klines);

      // Generate/fetch predictions
      const preds = await predictionService.generateAllPredictions(selectedSymbol);
      setPredictions(preds);
      setPerformanceMetrics(predictionService.getPerformanceMetrics());

      // Get sentiment
      const sent = await sentimentService.getSentimentAnalysis();
      setSentiment(sent);

      // Get news
      const newsWithSentiment = await sentimentService.getNewsWithSentiment();
      setNews(newsWithSentiment);

      // Get trading data
      await tradingService.updatePositionPnL();
      setPositions(tradingService.getPositions());
      setTrades(tradingService.getTradeHistory());
      setBalance(tradingService.getBalance());
      setTradingStats(tradingService.getStats());

      // Get security data
      await securityService.monitorTransactions();
      setAlerts(securityService.getAlerts());
      setTransactions(await securityService.fetchRecentTransactions());
      setAlertStats(securityService.getAlertStats());

      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Error initializing data:', error);
      setError('Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  // Connect WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    if (wsInitialized.current) {
      binanceService.disconnect();
    }

    binanceService.connectWebSocket(selectedSymbol, (tickerData) => {
      setCurrentPrice(tickerData.currentPrice);
      setPriceStats(tickerData);
      setWsConnected(true);
      setLastUpdated(new Date().toISOString());
    });

    wsInitialized.current = true;
  }, [selectedSymbol]);

  // Refresh predictions
  const refreshPredictions = useCallback(async () => {
    try {
      const preds = await predictionService.generateAllPredictions(selectedSymbol);
      setPredictions(preds);
      await predictionService.updatePredictionAccuracy(selectedSymbol);
      setPerformanceMetrics(predictionService.getPerformanceMetrics());
    } catch (error) {
      console.error('Error refreshing predictions:', error);
    }
  }, [selectedSymbol]);

  // Refresh sentiment
  const refreshSentiment = useCallback(async () => {
    try {
      const sent = await sentimentService.getSentimentAnalysis();
      setSentiment(sent);
      const newsWithSentiment = await sentimentService.getNewsWithSentiment();
      setNews(newsWithSentiment);
    } catch (error) {
      console.error('Error refreshing sentiment:', error);
    }
  }, []);

  // Refresh trading data
  const refreshTradingData = useCallback(async () => {
    try {
      await tradingService.updatePositionPnL();
      setPositions(tradingService.getPositions());
      setTrades(tradingService.getTradeHistory());
      setBalance(tradingService.getBalance());
      setTradingStats(tradingService.getStats());
    } catch (error) {
      console.error('Error refreshing trading data:', error);
    }
  }, []);

  // Refresh security data
  const refreshSecurityData = useCallback(async () => {
    try {
      await securityService.monitorTransactions();
      setAlerts(securityService.getAlerts());
      setTransactions(await securityService.fetchRecentTransactions());
      setAlertStats(securityService.getAlertStats());
    } catch (error) {
      console.error('Error refreshing security data:', error);
    }
  }, []);

  // Execute trade
  const executeTrade = useCallback(async (
    side: 'buy' | 'sell',
    amount: number,
    orderType: 'market' | 'limit' | 'prediction' = 'market'
  ) => {
    try {
      const trade = await tradingService.executeMarketOrder(
        selectedSymbol,
        side,
        amount,
        orderType
      );

      // Log execution to blockchain for security monitoring
      try {
        const executionId = `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await fetch('http://localhost:5001/api/trading/log-execution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            execution_id: executionId,
            execution_type: 'manual',
            symbol: selectedSymbol,
            side,
            amount,
            price: trade.price,
            fee: trade.fee,
            from_address: `0x${executionId.substring(0, 40)}`,
            to_address: `0xTRADING_CONTRACT_${selectedSymbol}`,
            position_id: trade.id,
            pnl: trade.pnl || 0,
          })
        });
        console.log('✅ Trade execution logged to blockchain');
      } catch (blockchainError) {
        console.warn('⚠️ Could not log trade to blockchain:', blockchainError);
      }

      // Refresh trading data
      await refreshTradingData();
      
      // Refresh security data to show the execution
      await refreshSecurityData();

      toast.success(
        `${side === 'buy' ? 'Bought' : 'Sold'} ${amount} ${selectedSymbol.replace('USDT', '')} at $${trade.price.toLocaleString()}`
      );

      return trade;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trade failed';
      toast.error(message);
      throw error;
    }
  }, [selectedSymbol, refreshTradingData, refreshSecurityData]);

  // Close position
  const closePosition = useCallback(async (positionId: string) => {
    try {
      const trade = await tradingService.closePosition(positionId);
      if (trade) {
        // Log closing trade to blockchain with P&L
        try {
          const executionId = `CLOSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await fetch('http://localhost:5001/api/trading/log-execution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              execution_id: executionId,
              execution_type: 'manual',
              symbol: selectedSymbol,
              side: 'sell',
              amount: trade.amount,
              price: trade.price,
              fee: trade.fee,
              from_address: `0x${executionId.substring(0, 40)}`,
              to_address: `0xTRADING_CONTRACT_${selectedSymbol}`,
              position_id: positionId,
              pnl: trade.pnl || 0,
            })
          });
          console.log('✅ Position close logged to blockchain');
        } catch (blockchainError) {
          console.warn('⚠️ Could not log position close to blockchain:', blockchainError);
        }

        await refreshTradingData();
        await refreshSecurityData();
        toast.success(`Position closed at $${trade.price.toLocaleString()}`);
      }
      return trade;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to close position';
      toast.error(message);
      throw error;
    }
  }, [selectedSymbol, refreshTradingData, refreshSecurityData]);

  // Analyze transaction
  const analyzeTransaction = useCallback(async (hash: string) => {
    return securityService.analyzeTransaction(hash);
  }, []);

  // Setup effect
  useEffect(() => {
    initializeData();
    connectWebSocket();

    // Set up intervals for periodic updates
    const predictionInterval = setInterval(refreshPredictions, 15 * 60 * 1000); // 15 min
    const sentimentInterval = setInterval(refreshSentiment, 30 * 60 * 1000);   // 30 min
    const tradingInterval = setInterval(refreshTradingData, 10 * 1000);        // 10 sec
    const securityInterval = setInterval(refreshSecurityData, 2 * 60 * 1000);  // 2 min
    const mlHealthInterval = setInterval(checkMLHealth, 5 * 60 * 1000);        // 5 min
    const accuracyInterval = setInterval(async () => {
      await predictionService.updatePredictionAccuracy(selectedSymbol);
      setPerformanceMetrics(predictionService.getPerformanceMetrics());
    }, 5 * 60 * 1000); // 5 min

    return () => {
      binanceService.disconnect();
      clearInterval(predictionInterval);
      clearInterval(sentimentInterval);
      clearInterval(tradingInterval);
      clearInterval(securityInterval);
      clearInterval(mlHealthInterval);
      clearInterval(accuracyInterval);
    };
  }, [selectedSymbol]);

  return {
    initializeData,
    refreshPredictions,
    refreshSentiment,
    refreshTradingData,
    refreshSecurityData,
    executeTrade,
    closePosition,
    analyzeTransaction,
  };
}

export default useRealTimeData;
