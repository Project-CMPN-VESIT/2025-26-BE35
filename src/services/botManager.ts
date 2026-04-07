import { gridTradingBot } from './tradingStrategies/gridTradingBot';
import { trendTradingBot } from './tradingStrategies/trendTradingBot';
import { swingTradingBot } from './tradingStrategies/swingTradingBot';
import { BinanceSymbol } from './binanceService';

interface BotStatus {
  grid: ReturnType<typeof gridTradingBot.getStatus>;
  trend: ReturnType<typeof trendTradingBot.getStatus>;
  swing: ReturnType<typeof swingTradingBot.getStatus>;
}

interface CombinedPerformance {
  totalPnL: number;
  activeBots: string[];
  totalTrades: number;
}

class BotManager {
  private bots = {
    grid: gridTradingBot,
    trend: trendTradingBot,
    swing: swingTradingBot
  };

  async startBot(botName: 'grid' | 'trend' | 'swing', symbol: BinanceSymbol = 'BTCUSDT'): Promise<boolean> {
    try {
      const result = await this.bots[botName].start(symbol);
      console.log(`${botName} bot started successfully`);
      return result !== false;
    } catch (error) {
      console.error(`Error starting ${botName} bot:`, error);
      throw error;
    }
  }

  async stopBot(botName: 'grid' | 'trend' | 'swing'): Promise<void> {
    try {
      await this.bots[botName].stop();
      console.log(`${botName} bot stopped successfully`);
    } catch (error) {
      console.error(`Error stopping ${botName} bot:`, error);
      throw error;
    }
  }

  async startAllBots(symbol: BinanceSymbol = 'BTCUSDT'): Promise<void> {
    for (const botName of Object.keys(this.bots) as Array<'grid' | 'trend' | 'swing'>) {
      try {
        await this.startBot(botName, symbol);
      } catch (error) {
        console.error(`Failed to start ${botName}:`, error);
      }
    }
  }

  async stopAllBots(): Promise<void> {
    for (const botName of Object.keys(this.bots) as Array<'grid' | 'trend' | 'swing'>) {
      try {
        await this.stopBot(botName);
      } catch (error) {
        console.error(`Failed to stop ${botName}:`, error);
      }
    }
  }

  getAllBotStatus(): BotStatus {
    return {
      grid: gridTradingBot.getStatus(),
      trend: trendTradingBot.getStatus(),
      swing: swingTradingBot.getStatus()
    };
  }

  getBotStatus(botName: 'grid' | 'trend' | 'swing') {
    return this.bots[botName].getStatus();
  }

  updateBotConfig(botName: 'grid' | 'trend' | 'swing', config: Record<string, unknown>): void {
    this.bots[botName].updateConfig(config);
  }

  getCombinedPerformance(): CombinedPerformance {
    const gridStatus = gridTradingBot.getStatus();
    const trendStatus = trendTradingBot.getStatus();
    const swingStatus = swingTradingBot.getStatus();

    return {
      totalPnL: (gridStatus.totalProfit || 0) + 
                (trendStatus.totalPnL || 0) + 
                (swingStatus.totalPnL || 0),
      activeBots: [
        gridStatus.isActive && 'Grid',
        trendStatus.isActive && 'Trend',
        swingStatus.isActive && 'Swing'
      ].filter(Boolean) as string[],
      totalTrades: (trendStatus.totalTrades || 0) + (swingStatus.totalTrades || 0)
    };
  }
}

export const botManager = new BotManager();
export default botManager;
