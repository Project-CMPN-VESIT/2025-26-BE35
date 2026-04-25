import { create } from 'zustand';
import { TickerStats, KlineData, BinanceSymbol } from '@/services/binanceService';
import { Prediction, PerformanceMetrics } from '@/services/predictionService';
import { SentimentAnalysis, NewsArticle } from '@/services/sentimentService';
import { Position, Trade, TradingStats } from '@/services/tradingService';
import { SecurityAlert, Transaction, AlertStats } from '@/services/securityService';
import { MLHealthStatus } from '@/services/mlPredictionService';

interface AppState {
  // Selected symbol
  selectedSymbol: BinanceSymbol;
  setSelectedSymbol: (symbol: BinanceSymbol) => void;

  // Price data
  currentPrice: number | null;
  priceStats: TickerStats | null;
  chartData: KlineData[];
  setCurrentPrice: (price: number | null) => void;
  setPriceStats: (stats: TickerStats | null) => void;
  setChartData: (data: KlineData[]) => void;

  // Predictions
  predictions: Prediction[];
  performanceMetrics: PerformanceMetrics | null;
  setPredictions: (predictions: Prediction[]) => void;
  setPerformanceMetrics: (metrics: PerformanceMetrics | null) => void;

  // Sentiment
  sentiment: SentimentAnalysis | null;
  news: (NewsArticle & { sentiment: number })[];
  setSentiment: (sentiment: SentimentAnalysis | null) => void;
  setNews: (news: (NewsArticle & { sentiment: number })[]) => void;

  // Trading
  positions: Position[];
  trades: Trade[];
  balance: number;
  tradingStats: TradingStats | null;
  setPositions: (positions: Position[]) => void;
  setTrades: (trades: Trade[]) => void;
  setBalance: (balance: number) => void;
  setTradingStats: (stats: TradingStats | null) => void;

  // Security
  alerts: SecurityAlert[];
  transactions: Transaction[];
  alertStats: AlertStats | null;
  setAlerts: (alerts: SecurityAlert[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setAlertStats: (stats: AlertStats | null) => void;

  // ML Model status
  mlAvailable: boolean;
  mlModelInfo: MLHealthStatus | null;
  setMlAvailable: (available: boolean) => void;
  setMlModelInfo: (info: MLHealthStatus | null) => void;

  // Auto-update settings
  autoUpdateEnabled: boolean;
  autoUpdateInterval: number; // minutes
  autoLogToBlockchain: boolean;
  lastBlockchainUpdate: string | null;
  setAutoUpdateEnabled: (enabled: boolean) => void;
  setAutoUpdateInterval: (minutes: number) => void;
  setAutoLogToBlockchain: (enabled: boolean) => void;
  setLastBlockchainUpdate: (timestamp: string | null) => void;

  // UI state
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;
  lastUpdated: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setWsConnected: (wsConnected: boolean) => void;
  setLastUpdated: (timestamp: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Selected symbol
  selectedSymbol: 'BTCUSDT',
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

  // Price data
  currentPrice: null,
  priceStats: null,
  chartData: [],
  setCurrentPrice: (price) => set({ currentPrice: price }),
  setPriceStats: (stats) => set({ priceStats: stats }),
  setChartData: (data) => set({ chartData: data }),

  // Predictions
  predictions: [],
  performanceMetrics: null,
  setPredictions: (predictions) => set({ predictions }),
  setPerformanceMetrics: (metrics) => set({ performanceMetrics: metrics }),

  // Sentiment
  sentiment: null,
  news: [],
  setSentiment: (sentiment) => set({ sentiment }),
  setNews: (news) => set({ news }),

  // Trading
  positions: [],
  trades: [],
  balance: 10000,
  tradingStats: null,
  setPositions: (positions) => set({ positions }),
  setTrades: (trades) => set({ trades }),
  setBalance: (balance) => set({ balance }),
  setTradingStats: (stats) => set({ tradingStats: stats }),

  // Security
  alerts: [],
  transactions: [],
  alertStats: null,
  setAlerts: (alerts) => set({ alerts }),
  setTransactions: (transactions) => set({ transactions }),
  setAlertStats: (stats) => set({ alertStats: stats }),

  // ML Model status
  mlAvailable: false,
  mlModelInfo: null,
  setMlAvailable: (available) => set({ mlAvailable: available }),
  setMlModelInfo: (info) => set({ mlModelInfo: info }),
  // Auto-update settings (default: enabled, 15 minutes, with blockchain logging)
  autoUpdateEnabled: true,
  autoUpdateInterval: 15,
  autoLogToBlockchain: true,
  lastBlockchainUpdate: null,
  setAutoUpdateEnabled: (enabled) => set({ autoUpdateEnabled: enabled }),
  setAutoUpdateInterval: (minutes) => set({ autoUpdateInterval: minutes }),
  setAutoLogToBlockchain: (enabled) => set({ autoLogToBlockchain: enabled }),
  setLastBlockchainUpdate: (timestamp) => set({ lastBlockchainUpdate: timestamp }),
  // UI state
  isLoading: false,
  error: null,
  wsConnected: false,
  lastUpdated: null,
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setLastUpdated: (timestamp) => set({ lastUpdated: timestamp })
}));
