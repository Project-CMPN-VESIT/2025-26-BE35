import binanceService, { BinanceSymbol } from '../binanceService';
import predictionService from '../predictionService';
import sentimentService from '../sentimentService';
import tradingService from '../tradingService';

interface SwingPosition {
  id: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  amount: number;
  entryTime: string;
  target3d: number;
  target7d: number;
  confidence3d: number;
  confidence7d: number;
  sentiment: number;
  status: 'open' | 'closed';
  partialExitDone: boolean;
  partialExitPrice?: number;
  partialPnL?: number;
  exitPrice?: number;
  exitTime?: string;
  totalPnL?: number;
  pnlPercent?: number;
  exitReason?: string;
}

interface SwingConfig {
  positionSize: number;
  minConfidence7d: number;
  minSentiment24h: number;
  partialExitPercent: number;
  holdDays: number;
}

interface SwingConditions {
  shouldTrade: boolean;
  direction: 'up' | 'down' | null;
  confidence3d?: number;
  confidence7d?: number;
  predicted3d?: number;
  predicted7d?: number;
  sentiment?: number;
  reason: string;
}

interface SwingStatus {
  isActive: boolean;
  openPositions: number;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  currentPositions: SwingPosition[];
  config: SwingConfig;
}

class SwingTradingBot {
  private isActive = false;
  private positions: SwingPosition[] = [];
  private config: SwingConfig = {
    positionSize: 0.15,
    minConfidence7d: 65,
    minSentiment24h: 0,
    partialExitPercent: 0.5,
    holdDays: 7
  };
  private trades: SwingPosition[] = [];
  private entryInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private symbol: BinanceSymbol = 'BTCUSDT';

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const stored = localStorage.getItem('swingBotConfig');
    if (stored) {
      this.config = { ...this.config, ...JSON.parse(stored) };
    }
  }

  private saveConfig(): void {
    localStorage.setItem('swingBotConfig', JSON.stringify(this.config));
  }

  async checkSwingConditions(): Promise<SwingConditions> {
    const predictions = predictionService.getPredictions();
    
    if (predictions.length < 2) {
      return { shouldTrade: false, direction: null, reason: 'Insufficient predictions' };
    }

    const pred3d = predictions.find(p => p.horizonMinutes === 4320);
    const pred7d = predictions.find(p => p.horizonMinutes === 10080);

    if (!pred3d || !pred7d) {
      return { shouldTrade: false, direction: null, reason: 'Missing long-term predictions' };
    }

    if (pred3d.direction !== pred7d.direction) {
      return { shouldTrade: false, direction: null, reason: '3d and 7d directions disagree' };
    }

    const direction = pred3d.direction;

    if (pred7d.confidence < this.config.minConfidence7d) {
      return { 
        shouldTrade: false, 
        direction, 
        reason: `7d confidence too low: ${pred7d.confidence.toFixed(1)}%` 
      };
    }

    const sentiment = await sentimentService.getSentimentScore();
    
    if (direction === 'up' && sentiment < this.config.minSentiment24h) {
      return { 
        shouldTrade: false, 
        direction, 
        reason: `Sentiment not supportive: ${sentiment.toFixed(2)}` 
      };
    }
    
    if (direction === 'down' && sentiment > -this.config.minSentiment24h) {
      return { 
        shouldTrade: false, 
        direction, 
        reason: `Sentiment not supportive: ${sentiment.toFixed(2)}` 
      };
    }

    return {
      shouldTrade: true,
      direction,
      confidence3d: pred3d.confidence,
      confidence7d: pred7d.confidence,
      predicted3d: pred3d.predictedPrice,
      predicted7d: pred7d.predictedPrice,
      sentiment,
      reason: 'All swing conditions satisfied'
    };
  }

  async enterSwingPosition(): Promise<boolean> {
    if (this.positions.some(p => p.status === 'open')) {
      console.log('Already have open swing position');
      return false;
    }

    const conditions = await this.checkSwingConditions();
    
    if (!conditions.shouldTrade || !conditions.direction) {
      console.log(`Swing entry rejected: ${conditions.reason}`);
      return false;
    }

    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (!currentPrice) return false;
    
    try {
      const side = conditions.direction === 'up' ? 'buy' : 'sell';
      await tradingService.executeMarketOrder(this.symbol, side, this.config.positionSize);
      
      const position: SwingPosition = {
        id: `SWING-${Date.now()}`,
        side,
        entryPrice: currentPrice,
        amount: this.config.positionSize,
        entryTime: new Date().toISOString(),
        target3d: conditions.predicted3d || currentPrice,
        target7d: conditions.predicted7d || currentPrice,
        confidence3d: conditions.confidence3d || 0,
        confidence7d: conditions.confidence7d || 0,
        sentiment: conditions.sentiment || 0,
        status: 'open',
        partialExitDone: false
      };
      
      this.positions.push(position);
      this.trades.push(position);
      
      console.log(`Swing ${side.toUpperCase()} entered at $${currentPrice.toFixed(2)}`);
      
      return true;
    } catch (error) {
      console.error('Error entering swing position:', error);
      return false;
    }
  }

  async monitorPositions(): Promise<void> {
    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (!currentPrice) return;
    
    const currentTime = Date.now();

    for (const position of this.positions) {
      if (position.status !== 'open') continue;

      const holdTime = currentTime - new Date(position.entryTime).getTime();
      const holdDays = holdTime / (1000 * 60 * 60 * 24);

      if (!position.partialExitDone) {
        const target3dReached = position.side === 'buy' 
          ? currentPrice >= position.target3d
          : currentPrice <= position.target3d;

        if (target3dReached) {
          await this.partialExit(position, currentPrice);
        }
      }

      let shouldExit = false;
      let exitReason = '';

      const target7dReached = position.side === 'buy'
        ? currentPrice >= position.target7d
        : currentPrice <= position.target7d;

      if (target7dReached) {
        shouldExit = true;
        exitReason = '7-day target reached';
      }

      if (holdDays >= this.config.holdDays) {
        shouldExit = true;
        exitReason = 'Maximum hold period reached';
      }

      const sentiment = await sentimentService.getSentimentScore();
      const sentimentReversed = position.side === 'buy' 
        ? sentiment < -0.3
        : sentiment > 0.3;

      if (sentimentReversed) {
        shouldExit = true;
        exitReason = 'Sentiment reversal detected';
      }

      if (shouldExit) {
        await this.fullExit(position, currentPrice, exitReason);
      }
    }
  }

  async partialExit(position: SwingPosition, exitPrice: number): Promise<void> {
    const partialAmount = position.amount * this.config.partialExitPercent;

    try {
      const exitSide = position.side === 'buy' ? 'sell' : 'buy';
      await tradingService.executeMarketOrder(this.symbol, exitSide, partialAmount);

      const partialPnL = position.side === 'buy'
        ? (exitPrice - position.entryPrice) * partialAmount
        : (position.entryPrice - exitPrice) * partialAmount;

      position.partialExitDone = true;
      position.partialExitPrice = exitPrice;
      position.partialPnL = partialPnL;
      position.amount -= partialAmount;

      console.log(`Partial exit at $${exitPrice.toFixed(2)}, P&L: $${partialPnL.toFixed(2)}`);
    } catch (error) {
      console.error('Error executing partial exit:', error);
    }
  }

  async fullExit(position: SwingPosition, exitPrice: number, reason: string): Promise<void> {
    try {
      const exitSide = position.side === 'buy' ? 'sell' : 'buy';
      await tradingService.executeMarketOrder(this.symbol, exitSide, position.amount);

      const remainingPnL = position.side === 'buy'
        ? (exitPrice - position.entryPrice) * position.amount
        : (position.entryPrice - exitPrice) * position.amount;

      const totalPnL = (position.partialPnL || 0) + remainingPnL;
      const avgPnLPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

      position.status = 'closed';
      position.exitPrice = exitPrice;
      position.exitTime = new Date().toISOString();
      position.totalPnL = totalPnL;
      position.pnlPercent = avgPnLPercent;
      position.exitReason = reason;

      console.log(`Swing position closed at $${exitPrice.toFixed(2)}, Total P&L: $${totalPnL.toFixed(2)}`);
    } catch (error) {
      console.error('Error executing full exit:', error);
    }
  }

  async start(symbol: BinanceSymbol = 'BTCUSDT'): Promise<void> {
    this.symbol = symbol;
    this.isActive = true;

    this.entryInterval = setInterval(async () => {
      await this.enterSwingPosition();
    }, 60 * 60 * 1000);

    this.monitorInterval = setInterval(async () => {
      await this.monitorPositions();
    }, 5 * 60 * 1000);

    await this.enterSwingPosition();

    console.log('Swing Trading Bot started');
  }

  async stop(): Promise<void> {
    this.isActive = false;

    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (currentPrice) {
      for (const position of this.positions) {
        if (position.status === 'open') {
          await this.fullExit(position, currentPrice, 'Bot stopped by user');
        }
      }
    }

    if (this.entryInterval) clearInterval(this.entryInterval);
    if (this.monitorInterval) clearInterval(this.monitorInterval);

    console.log('Swing Trading Bot stopped');
  }

  getStatus(): SwingStatus {
    const openPositions = this.positions.filter(p => p.status === 'open');
    const closedTrades = this.positions.filter(p => p.status === 'closed');
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.totalPnL || 0), 0);
    const winningTrades = closedTrades.filter(t => (t.totalPnL || 0) > 0);
    const winRate = closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;

    return {
      isActive: this.isActive,
      openPositions: openPositions.length,
      totalTrades: closedTrades.length,
      winRate,
      totalPnL,
      currentPositions: openPositions,
      config: this.config
    };
  }

  updateConfig(newConfig: Partial<SwingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  getTradeHistory(): SwingPosition[] {
    return this.trades;
  }
}

export const swingTradingBot = new SwingTradingBot();
export default swingTradingBot;
