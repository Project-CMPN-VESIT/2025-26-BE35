import binanceService, { BinanceSymbol } from './binanceService';

export interface Position {
  id: string;
  symbol: BinanceSymbol;
  side: 'buy' | 'sell';
  type: 'LONG' | 'SHORT';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  timestamp: string;
  pnl?: number;
  pnlPercent?: number;
}

export interface Trade {
  id: string;
  timestamp: string;
  symbol: BinanceSymbol;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  fee: number;
  type: 'market' | 'limit' | 'prediction';
  pnl?: number;
}

export interface TradingStats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
}

const STORAGE_KEYS = {
  positions: 'intellidex_positions',
  trades: 'intellidex_trades',
  balance: 'intellidex_balance'
};

const INITIAL_BALANCE = 10000;

class TradingService {
  private positions: Position[] = [];
  private trades: Trade[] = [];
  private balance: number = INITIAL_BALANCE;

  constructor() {
    this.positions = this.loadPositions();
    this.trades = this.loadTrades();
    this.balance = this.loadBalance();
  }

  private loadPositions(): Position[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.positions);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadTrades(): Trade[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.trades);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadBalance(): number {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.balance);
      return stored ? parseFloat(stored) : INITIAL_BALANCE;
    } catch {
      return INITIAL_BALANCE;
    }
  }

  private savePositions(): void {
    localStorage.setItem(STORAGE_KEYS.positions, JSON.stringify(this.positions));
  }

  private saveTrades(): void {
    // Keep only last 200 trades
    if (this.trades.length > 200) {
      this.trades = this.trades.slice(-200);
    }
    localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(this.trades));
  }

  private saveBalance(): void {
    localStorage.setItem(STORAGE_KEYS.balance, this.balance.toString());
  }

  // Execute market order
  async executeMarketOrder(
    symbol: BinanceSymbol,
    side: 'buy' | 'sell',
    amount: number,
    orderType: 'market' | 'limit' | 'prediction' = 'market'
  ): Promise<Trade> {
    const currentPrice = await binanceService.getCurrentPrice(symbol);
    if (!currentPrice) throw new Error('Failed to get current price');

    const total = amount * currentPrice;
    const fee = total * 0.001; // 0.1% fee

    // Check balance for buy orders
    if (side === 'buy' && this.balance < total + fee) {
      throw new Error('Insufficient balance');
    }

    // For sell orders, check if we have enough position
    if (side === 'sell') {
      const totalPosition = this.positions
        .filter(p => p.symbol === symbol && p.side === 'buy')
        .reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPosition < amount) {
        throw new Error('Insufficient position to sell');
      }
    }

    // Update balance
    if (side === 'buy') {
      this.balance -= (total + fee);
    } else {
      this.balance += (total - fee);
    }

    // Create trade record
    const trade: Trade = {
      id: `TRADE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      symbol,
      side,
      amount,
      price: currentPrice,
      total,
      fee,
      type: orderType
    };

    // Create or update position
    if (side === 'buy') {
      this.positions.push({
        id: `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side,
        type: 'LONG',
        amount,
        entryPrice: currentPrice,
        currentPrice,
        timestamp: new Date().toISOString()
      });
    } else {
      // Close position (FIFO)
      let remainingToSell = amount;
      const closedPositions: Position[] = [];

      for (const position of this.positions) {
        if (position.symbol === symbol && position.side === 'buy' && remainingToSell > 0) {
          if (position.amount <= remainingToSell) {
            // Close entire position
            const pnl = (currentPrice - position.entryPrice) * position.amount;
            trade.pnl = (trade.pnl || 0) + pnl;
            closedPositions.push(position);
            remainingToSell -= position.amount;
          } else {
            // Partially close position
            const pnl = (currentPrice - position.entryPrice) * remainingToSell;
            trade.pnl = (trade.pnl || 0) + pnl;
            position.amount -= remainingToSell;
            remainingToSell = 0;
          }
        }
      }

      // Remove closed positions
      this.positions = this.positions.filter(p => !closedPositions.includes(p));
    }

    this.trades.push(trade);
    this.savePositions();
    this.saveTrades();
    this.saveBalance();

    return trade;
  }

  // Update position P&L with current price
  async updatePositionPnL(): Promise<void> {
    const pricePromises = [...new Set(this.positions.map(p => p.symbol))].map(async symbol => {
      const price = await binanceService.getCurrentPrice(symbol);
      return { symbol, price };
    });

    const prices = await Promise.all(pricePromises);
    const priceMap = new Map(prices.map(p => [p.symbol, p.price]));

    for (const position of this.positions) {
      const currentPrice = priceMap.get(position.symbol);
      if (currentPrice) {
        position.currentPrice = currentPrice;
        position.pnl = (currentPrice - position.entryPrice) * position.amount;
        position.pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      }
    }
    this.savePositions();
  }

  // Close a specific position
  async closePosition(positionId: string): Promise<Trade | null> {
    const position = this.positions.find(p => p.id === positionId);
    if (!position) return null;

    return this.executeMarketOrder(position.symbol, 'sell', position.amount);
  }

  // Get trading statistics
  getStats(): TradingStats {
    const completedTrades = this.trades.filter(t => t.pnl !== undefined);
    
    if (completedTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        bestTrade: 0,
        worstTrade: 0
      };
    }

    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
    const pnls = completedTrades.map(t => t.pnl || 0);

    return {
      totalTrades: completedTrades.length,
      winRate: (winningTrades.length / completedTrades.length) * 100,
      totalPnL,
      bestTrade: Math.max(...pnls, 0),
      worstTrade: Math.min(...pnls, 0)
    };
  }

  // Get balance
  getBalance(): number {
    return this.balance;
  }

  // Get positions
  getPositions(): Position[] {
    return [...this.positions];
  }

  // Get trade history
  getTradeHistory(limit: number = 50): Trade[] {
    return this.trades.slice(-limit).reverse();
  }

  // Get total portfolio value
  getTotalPortfolioValue(): number {
    const positionsValue = this.positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
    return this.balance + positionsValue;
  }

  // Reset account (for demo purposes)
  reset(): void {
    this.positions = [];
    this.trades = [];
    this.balance = INITIAL_BALANCE;
    this.savePositions();
    this.saveTrades();
    this.saveBalance();
  }
}

export const tradingService = new TradingService();
export default tradingService;
