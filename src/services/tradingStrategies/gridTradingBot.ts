import binanceService, { BinanceSymbol } from '../binanceService';
import predictionService from '../predictionService';
import tradingService from '../tradingService';
import sentimentService from '../sentimentService';

interface GridLevel {
  price: number;
  buyOrderPlaced: boolean;
  sellOrderPlaced: boolean;
  orderIds: string[];
  buyTargetPrice?: number;
  sellTargetPrice?: number;
  filled?: boolean;
  fillPrice?: number;
  waitingToSell?: boolean;
  profitRealized?: number;
}

interface GridConfig {
  gridCount: number;
  rangePercent: number;
  quantityPerLevel: number;
  profitPercent: number;
}

interface GridStatus {
  isActive: boolean;
  gridLevels: number;
  activeLevels: number;
  totalProfit: number;
  config: GridConfig;
}

class GridTradingBot {
  private isActive = false;
  private gridLevels: GridLevel[] = [];
  private config: GridConfig = {
    gridCount: 10,
    rangePercent: 0.05,
    quantityPerLevel: 0.01,
    profitPercent: 0.01
  };
  private monitorInterval: NodeJS.Timeout | null = null;
  private symbol: BinanceSymbol = 'BTCUSDT';

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const stored = localStorage.getItem('gridBotConfig');
    if (stored) {
      this.config = { ...this.config, ...JSON.parse(stored) };
    }
  }

  private saveConfig(): void {
    localStorage.setItem('gridBotConfig', JSON.stringify(this.config));
  }

  async shouldActivateGrid(): Promise<boolean> {
    const predictions = predictionService.getPredictions();
    
    if (predictions.length < 3) return true; // Allow activation with limited predictions

    const pred1h = predictions.find(p => p.horizonMinutes === 60);
    const pred1d = predictions.find(p => p.horizonMinutes === 1440);
    const pred7d = predictions.find(p => p.horizonMinutes === 10080);

    // Condition 1: Low confidence on long-term
    const lowLongTermConfidence = !pred7d || pred7d.confidence < 60;

    // Condition 2: Disagreement between 1h and 1d
    const directionDisagreement = pred1h && pred1d && pred1h.direction !== pred1d.direction;

    // Condition 3: Check if sentiment is mixed (near neutral)
    const sentiment = await sentimentService.getSentimentScore();
    const mixedSentiment = Math.abs(sentiment) < 0.3;

    return lowLongTermConfidence || directionDisagreement || mixedSentiment;
  }

  async setupGrid(): Promise<boolean> {
    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (!currentPrice) return false;

    this.gridLevels = [];
    const rangeSize = currentPrice * this.config.rangePercent;
    const gridSpacing = (rangeSize * 2) / this.config.gridCount;
    const bottomPrice = currentPrice - rangeSize;

    for (let i = 0; i <= this.config.gridCount; i++) {
      const price = bottomPrice + (gridSpacing * i);
      this.gridLevels.push({
        price,
        buyOrderPlaced: false,
        sellOrderPlaced: false,
        orderIds: []
      });
    }

    console.log('Grid levels setup:', this.gridLevels.length);
    return true;
  }

  async placeGridOrders(): Promise<void> {
    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (!currentPrice) return;
    
    for (const level of this.gridLevels) {
      if (level.price < currentPrice && !level.buyOrderPlaced) {
        level.buyOrderPlaced = true;
        level.buyTargetPrice = level.price;
        level.sellTargetPrice = level.price * (1 + this.config.profitPercent);
        console.log(`Grid buy order set at $${level.price.toFixed(2)}`);
      }
    }
  }

  async monitorGrid(): Promise<void> {
    if (!this.isActive) return;

    const currentPrice = await binanceService.getCurrentPrice(this.symbol);
    if (!currentPrice) return;
    
    for (const level of this.gridLevels) {
      if (level.buyOrderPlaced && !level.filled && level.buyTargetPrice && currentPrice <= level.buyTargetPrice) {
        try {
          await tradingService.executeMarketOrder(this.symbol, 'buy', this.config.quantityPerLevel);
          level.filled = true;
          level.fillPrice = currentPrice;
          level.waitingToSell = true;
          console.log(`Grid buy executed at $${currentPrice.toFixed(2)}`);
        } catch (error) {
          console.error('Error executing grid buy:', error);
        }
      }

      if (level.waitingToSell && level.sellTargetPrice && currentPrice >= level.sellTargetPrice) {
        try {
          await tradingService.executeMarketOrder(this.symbol, 'sell', this.config.quantityPerLevel);
          level.waitingToSell = false;
          level.profitRealized = (level.sellTargetPrice - (level.fillPrice || 0)) * this.config.quantityPerLevel;
          console.log(`Grid sell executed at $${currentPrice.toFixed(2)}, Profit: $${level.profitRealized.toFixed(2)}`);
          
          level.filled = false;
          level.buyOrderPlaced = false;
        } catch (error) {
          console.error('Error executing grid sell:', error);
        }
      }
    }
  }

  async start(symbol: BinanceSymbol = 'BTCUSDT'): Promise<boolean> {
    this.symbol = symbol;
    const shouldActivate = await this.shouldActivateGrid();
    
    if (!shouldActivate) {
      console.log('Market conditions not suitable for grid trading');
      return false;
    }

    this.isActive = true;
    await this.setupGrid();
    await this.placeGridOrders();
    
    this.monitorInterval = setInterval(() => {
      this.monitorGrid();
    }, 10000);

    console.log('Grid Trading Bot started');
    return true;
  }

  stop(): void {
    this.isActive = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    console.log('Grid Trading Bot stopped');
  }

  getStatus(): GridStatus {
    const totalProfit = this.gridLevels.reduce((sum, level) => 
      sum + (level.profitRealized || 0), 0
    );
    const activeLevels = this.gridLevels.filter(l => l.filled || l.waitingToSell).length;

    return {
      isActive: this.isActive,
      gridLevels: this.gridLevels.length,
      activeLevels,
      totalProfit,
      config: this.config
    };
  }

  updateConfig(newConfig: Partial<GridConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }
}

export const gridTradingBot = new GridTradingBot();
export default gridTradingBot;
