import binanceService, { BinanceSymbol } from '../binanceService';
import predictionService from '../predictionService';
import sentimentService from '../sentimentService';
import tradingService from '../tradingService';

interface TrendPosition {
  side: 'buy' | 'sell';
  entryPrice: number;
  amount: number;
  entryTime: string;
  confidence: number;
  sentiment: number;
}

interface TrendTrade extends TrendPosition {
  status: 'open' | 'closed';
  exitPrice?: number;
  exitTime?: string;
  pnl?: number;
  pnlPercent?: number;
  exitReason?: string;
}

interface TrendConfig {
  positionSize: number;
  minConfidence: number;
  minSentiment: number;
  trailingStopPercent: number;
}

interface TrendConditions {
  shouldTrade: boolean;
  direction: 'up' | 'down' | null;
  confidence?: number;
  sentiment?: number;
  reason: string;
}

interface TrendStatus {
  isActive: boolean;
  currentPosition: TrendPosition | null;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  config: TrendConfig;
}

class TrendTradingBot {
  private isActive = false;
  private currentPosition: TrendPosition | null = null;
  private entryPrice: number | null = null;
  private highestPrice: number | null = null;
  private config: TrendConfig = {
    positionSize: 0.1,
    minConfidence: 75,
    minSentiment: 0,
    trailingStopPercent: 0.02
  };
  private trades: TrendTrade[] = [];
  private entryInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private symbol: BinanceSymbol = 'BTCUSDT';

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const stored = localStorage.getItem('trendBotConfig');
    if (stored) {
      this.config = { ...this.config, ...JSON.parse(stored) };
    }
  }

  private saveConfig(): void {
    localStorage.setItem('trendBotConfig', JSON.stringify(this.config));
  }

  async checkTrendConditions(): Promise<TrendConditions> {
    const predictions = predictionService.getPredictions();
    
    if (predictions.length < 3) {
      return { shouldTrade: false, direction: null, reason: 'Insufficient predictions' };
    }

    const pred1h = predictions.find(p => p.horizonMinutes === 60);
    const pred4h = predictions.find(p => p.horizonMinutes === 240);
    const pred1d = predictions.find(p => p.horizonMinutes === 1440);

    if (!pred1h || !pred4h || !pred1d) {
      return { shouldTrade: false, direction: null, reason: 'Missing key predictions' };
    }

    const allUp = pred1h.direction === 'up' && pred4h.direction === 'up' && pred1d.direction === 'up';
    const allDown = pred1h.direction === 'down' && pred4h.direction === 'down' && pred1d.direction === 'down';
    
    if (!allUp && !allDown) {
      return { shouldTrade: false, direction: null, reason: 'Directions do not agree' };
    }

    const direction = allUp ? 'up' : 'down';
    const avgConfidence = (pred1h.confidence + pred4h.confidence + pred1d.confidence) / 3;
    
    if (avgConfidence < this.config.minConfidence) {
      return { shouldTrade: false, direction, reason: `Low confidence: ${avgConfidence.toFixed(1)}%` };
    }

    const sentiment = await sentimentService.getSentimentScore();
    
    if (direction === 'up' && sentiment < this.config.minSentiment) {
      return { shouldTrade: false, direction, reason: `Sentiment not bullish: ${sentiment.toFixed(2)}` };
    }
    
    if (direction === 'down' && sentiment > -this.config.minSentiment) {
      return { shouldTrade: false, direction, reason: `Sentiment not bearish: ${sentiment.toFixed(2)}` };
    }

    return {
      shouldTrade: true,
      direction,
      confidence: avgConfidence,
      sentiment,
      reason: 'All trend conditions satisfied'
    };
  }

  async enterTrade(): Promise<boolean> {
    if (this.currentPosition) return false;
    
    const conditions = await this.checkTrendConditions();
    
    if (!conditions.shouldTrade || !conditions.direction) {
      console.log(`Trend entry rejected: ${conditions.reason}`);
      return false;
    }

    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (!currentPrice) return false;
    
    try {
      const side = conditions.direction === 'up' ? 'buy' : 'sell';
      await tradingService.executeMarketOrder(this.symbol, side, this.config.positionSize);
      
      this.currentPosition = {
        side,
        entryPrice: currentPrice,
        amount: this.config.positionSize,
        entryTime: new Date().toISOString(),
        confidence: conditions.confidence || 0,
        sentiment: conditions.sentiment || 0
      };
      
      this.entryPrice = currentPrice;
      this.highestPrice = currentPrice;
      
      console.log(`Trend ${side.toUpperCase()} entered at $${currentPrice.toFixed(2)}`);
      
      this.trades.push({
        ...this.currentPosition,
        status: 'open'
      });
      
      return true;
    } catch (error) {
      console.error('Error entering trend trade:', error);
      return false;
    }
  }

  async monitorTrade(): Promise<void> {
    if (!this.currentPosition || !this.entryPrice) return;

    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (!currentPrice) return;
    
    if (this.currentPosition.side === 'buy' && currentPrice > (this.highestPrice || 0)) {
      this.highestPrice = currentPrice;
    }
    
    if (this.currentPosition.side === 'sell' && currentPrice < (this.highestPrice || Infinity)) {
      this.highestPrice = currentPrice;
    }

    let shouldExit = false;
    let exitReason = '';

    if (this.currentPosition.side === 'buy' && this.highestPrice) {
      const stopPrice = this.highestPrice * (1 - this.config.trailingStopPercent);
      if (currentPrice <= stopPrice) {
        shouldExit = true;
        exitReason = 'Trailing stop hit';
      }
    } else if (this.highestPrice) {
      const stopPrice = this.highestPrice * (1 + this.config.trailingStopPercent);
      if (currentPrice >= stopPrice) {
        shouldExit = true;
        exitReason = 'Trailing stop hit';
      }
    }

    const conditions = await this.checkTrendConditions();
    if (!conditions.shouldTrade || conditions.direction !== (this.currentPosition.side === 'buy' ? 'up' : 'down')) {
      shouldExit = true;
      exitReason = 'Trend conditions no longer met';
    }

    if (shouldExit) {
      await this.exitTrade(currentPrice, exitReason);
    }
  }

  async exitTrade(exitPrice: number, reason: string): Promise<void> {
    if (!this.currentPosition || !this.entryPrice) return;

    try {
      const exitSide = this.currentPosition.side === 'buy' ? 'sell' : 'buy';
      await tradingService.executeMarketOrder(this.symbol, exitSide, this.config.positionSize);
      
      const pnl = this.currentPosition.side === 'buy' 
        ? (exitPrice - this.entryPrice) * this.config.positionSize
        : (this.entryPrice - exitPrice) * this.config.positionSize;
      
      const pnlPercent = ((exitPrice - this.entryPrice) / this.entryPrice) * 100;
      
      console.log(`Trend position closed at $${exitPrice.toFixed(2)}, P&L: $${pnl.toFixed(2)}`);
      
      const lastTrade = this.trades[this.trades.length - 1];
      if (lastTrade) {
        lastTrade.exitPrice = exitPrice;
        lastTrade.exitTime = new Date().toISOString();
        lastTrade.pnl = pnl;
        lastTrade.pnlPercent = pnlPercent;
        lastTrade.exitReason = reason;
        lastTrade.status = 'closed';
      }
      
      this.currentPosition = null;
      this.entryPrice = null;
      this.highestPrice = null;
    } catch (error) {
      console.error('Error exiting trend trade:', error);
    }
  }

  async start(symbol: BinanceSymbol = 'BTCUSDT'): Promise<void> {
    this.symbol = symbol;
    this.isActive = true;
    
    this.entryInterval = setInterval(async () => {
      if (!this.currentPosition) {
        await this.enterTrade();
      }
    }, 30000);

    this.monitorInterval = setInterval(async () => {
      await this.monitorTrade();
    }, 10000);

    console.log('Trend Trading Bot started');
  }

  async stop(): Promise<void> {
    this.isActive = false;
    
    if (this.currentPosition) {
      const currentPrice = await binanceService.getCurrentPrice(this.symbol);
      if (currentPrice) {
        await this.exitTrade(currentPrice, 'Bot stopped by user');
      }
    }
    
    if (this.entryInterval) clearInterval(this.entryInterval);
    if (this.monitorInterval) clearInterval(this.monitorInterval);
    
    console.log('Trend Trading Bot stopped');
  }

  getStatus(): TrendStatus {
    const completedTrades = this.trades.filter(t => t.status === 'closed');
    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = completedTrades.length > 0 
      ? (winningTrades.length / completedTrades.length) * 100 
      : 0;

    return {
      isActive: this.isActive,
      currentPosition: this.currentPosition,
      totalTrades: completedTrades.length,
      winRate,
      totalPnL,
      config: this.config
    };
  }

  updateConfig(newConfig: Partial<TrendConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getTradeHistory(): TrendTrade[] {
    return this.trades;
  }
}

export const trendTradingBot = new TrendTradingBot();
export default trendTradingBot;
