import axios from 'axios';

const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

// Use edge function proxy to avoid CORS/geo-blocking
const getProxyUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/binance-proxy`;
};

export interface TickerStats {
  symbol: string;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h?: number;
  timestamp?: number;
}

export interface KlineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type BinanceSymbol = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | 'BNBUSDT' | 'XRPUSDT' | 'ADAUSDT';

export const SUPPORTED_SYMBOLS: { id: BinanceSymbol; name: string; symbol: string }[] = [
  { id: 'BTCUSDT', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'ETHUSDT', name: 'Ethereum', symbol: 'ETH' },
  { id: 'SOLUSDT', name: 'Solana', symbol: 'SOL' },
  { id: 'BNBUSDT', name: 'BNB', symbol: 'BNB' },
  { id: 'XRPUSDT', name: 'XRP', symbol: 'XRP' },
  { id: 'ADAUSDT', name: 'Cardano', symbol: 'ADA' },
];

// Realistic base prices that get slowly randomized
const BASE_PRICES: Record<BinanceSymbol, number> = {
  BTCUSDT: 97850,
  ETHUSDT: 3280,
  SOLUSDT: 198,
  BNBUSDT: 645,
  XRPUSDT: 2.72,
  ADAUSDT: 0.78
};

// Track simulated prices so they drift realistically
const simulatedPrices: Record<string, number> = {};

function getSimulatedPrice(symbol: BinanceSymbol): number {
  if (!simulatedPrices[symbol]) {
    simulatedPrices[symbol] = BASE_PRICES[symbol];
  }
  // Random walk: ±0.15% per tick
  const drift = (Math.random() - 0.5) * 0.003;
  simulatedPrices[symbol] *= (1 + drift);
  return simulatedPrices[symbol];
}

class BinanceService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private simulatedInterval: ReturnType<typeof setInterval> | null = null;
  private useProxy = true;

  // Try proxy first, fall back to mock
  async getCurrentPrice(symbol: BinanceSymbol = 'BTCUSDT'): Promise<number | null> {
    if (this.useProxy) {
      try {
        const proxyUrl = getProxyUrl();
        const response = await axios.get(proxyUrl, {
          params: { endpoint: 'price', symbol },
          timeout: 5000
        });
        if (response.data?.price) {
          const price = parseFloat(response.data.price);
          simulatedPrices[symbol] = price; // Keep simulated in sync
          return price;
        }
      } catch (error) {
        console.warn('Proxy price fetch failed, using simulated data');
      }
    }
    return getSimulatedPrice(symbol);
  }

  async get24hStats(symbol: BinanceSymbol = 'BTCUSDT'): Promise<TickerStats | null> {
    if (this.useProxy) {
      try {
        const proxyUrl = getProxyUrl();
        const response = await axios.get(proxyUrl, {
          params: { endpoint: '24hr', symbol },
          timeout: 5000
        });
        if (response.data?.lastPrice) {
          const stats: TickerStats = {
            symbol: response.data.symbol,
            currentPrice: parseFloat(response.data.lastPrice),
            change24h: parseFloat(response.data.priceChange),
            changePercent24h: parseFloat(response.data.priceChangePercent),
            high24h: parseFloat(response.data.highPrice),
            low24h: parseFloat(response.data.lowPrice),
            volume24h: parseFloat(response.data.volume),
            quoteVolume24h: parseFloat(response.data.quoteVolume)
          };
          simulatedPrices[symbol] = stats.currentPrice;
          return stats;
        }
      } catch (error) {
        console.warn('Proxy 24h stats failed, using simulated data');
      }
    }
    return this.getSimulated24hStats(symbol);
  }

  private getSimulated24hStats(symbol: BinanceSymbol): TickerStats {
    const price = getSimulatedPrice(symbol);
    const change = (Math.random() - 0.3) * 4; // Slight bullish bias
    return {
      symbol,
      currentPrice: price,
      change24h: price * (change / 100),
      changePercent24h: change,
      high24h: price * 1.025,
      low24h: price * 0.975,
      volume24h: symbol === 'BTCUSDT' ? 28500 + Math.random() * 5000 : 50000 + Math.random() * 10000
    };
  }

  async getKlines(symbol: BinanceSymbol = 'BTCUSDT', interval: string = '1h', limit: number = 100): Promise<KlineData[]> {
    if (this.useProxy) {
      try {
        const proxyUrl = getProxyUrl();
        const response = await axios.get(proxyUrl, {
          params: { endpoint: 'klines', symbol, interval, limit: limit.toString() },
          timeout: 8000
        });
        if (Array.isArray(response.data) && response.data.length > 0) {
          return response.data.map((candle: any[]) => ({
            timestamp: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          }));
        }
      } catch (error) {
        console.warn('Proxy klines fetch failed, using simulated data');
      }
    }
    return this.getSimulatedKlines(symbol, interval, limit);
  }

  private getSimulatedKlines(symbol: BinanceSymbol, interval: string, limit: number): KlineData[] {
    const klines: KlineData[] = [];
    let price = BASE_PRICES[symbol] * 0.97; // Start slightly below current
    const now = Date.now();
    
    const intervalMs: Record<string, number> = {
      '1m': 60000, '5m': 300000, '15m': 900000,
      '1h': 3600000, '4h': 14400000, '1d': 86400000, '1w': 604800000
    };
    const ms = intervalMs[interval] || 3600000;
    
    for (let i = limit - 1; i >= 0; i--) {
      const trend = 0.0001; // Slight upward trend
      const volatility = symbol === 'BTCUSDT' ? 0.008 : 0.012;
      const change = (Math.random() - 0.48 + trend) * volatility;
      
      const open = price;
      const close = price * (1 + change);
      const wickUp = Math.random() * Math.abs(close - open) * 0.5;
      const wickDown = Math.random() * Math.abs(close - open) * 0.5;
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDown;
      
      const baseVolume = symbol === 'BTCUSDT' ? 500000000 : 50000000;
      const volume = baseVolume * (0.7 + Math.random() * 0.6);
      
      klines.push({
        timestamp: now - i * ms,
        open, high, low, close, volume
      });
      
      price = close;
    }
    
    // Update simulated price to latest close
    if (klines.length > 0) {
      simulatedPrices[symbol] = klines[klines.length - 1].close;
    }
    
    return klines;
  }

  // Connect WebSocket - tries real WS first, falls back to simulated updates
  connectWebSocket(symbol: BinanceSymbol = 'BTCUSDT', callback: (data: TickerStats) => void): void {
    this.disconnect();

    const stream = `${symbol.toLowerCase()}@ticker`;
    
    try {
      this.ws = new WebSocket(`${BINANCE_WS}/${stream}`);
      
      this.ws.onopen = () => {
        console.log('Binance WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const tickerData: TickerStats = {
          symbol: data.s,
          currentPrice: parseFloat(data.c),
          change24h: parseFloat(data.p),
          changePercent24h: parseFloat(data.P),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          volume24h: parseFloat(data.v),
          timestamp: data.E
        };
        simulatedPrices[symbol] = tickerData.currentPrice;
        callback(tickerData);
      };

      this.ws.onerror = () => {
        console.warn('WebSocket failed, switching to simulated updates');
        this.startSimulatedUpdates(symbol, callback);
      };

      this.ws.onclose = (event) => {
        // If it closed abnormally or never connected properly, use simulated
        if (event.code !== 1000) {
          this.startSimulatedUpdates(symbol, callback);
        }
      };

      // Fallback: if no message received in 5 seconds, switch to simulated
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.startSimulatedUpdates(symbol, callback);
        }
      }, 5000);

    } catch {
      this.startSimulatedUpdates(symbol, callback);
    }
  }

  private startSimulatedUpdates(symbol: BinanceSymbol, callback: (data: TickerStats) => void): void {
    // Clear any existing WebSocket
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    
    // Clear any existing simulated interval
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
    }

    console.log('Starting simulated real-time updates for', symbol);
    
    // Generate base stats once
    const baseChange = (Math.random() - 0.3) * 4;
    const basePrice = getSimulatedPrice(symbol);
    
    this.simulatedInterval = setInterval(() => {
      const price = getSimulatedPrice(symbol);
      const stats: TickerStats = {
        symbol,
        currentPrice: price,
        change24h: price * (baseChange / 100),
        changePercent24h: baseChange + (Math.random() - 0.5) * 0.1,
        high24h: Math.max(basePrice * 1.025, price),
        low24h: Math.min(basePrice * 0.975, price),
        volume24h: symbol === 'BTCUSDT' ? 28500 + Math.random() * 5000 : 50000 + Math.random() * 10000,
        timestamp: Date.now()
      };
      callback(stats);
    }, 2000); // Update every 2 seconds
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }

  // Calculate simple moving average
  calculateSMA(data: KlineData[], period: number): { timestamp: number; value: number }[] {
    const values = data.map(d => d.close);
    const result: { timestamp: number; value: number }[] = [];
    
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push({
        timestamp: data[i].timestamp,
        value: sum / period
      });
    }
    
    return result;
  }

  // Calculate RSI
  calculateRSI(data: KlineData[], period: number = 14): number {
    const closes = data.map(d => d.close);
    
    if (closes.length < period + 1) {
      return 50;
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const difference = closes[i] - closes[i - 1];
      if (difference >= 0) gains += difference;
      else losses -= difference;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rsi = [100 - (100 / (1 + avgGain / avgLoss))];

    for (let i = period + 1; i < closes.length; i++) {
      const difference = closes[i] - closes[i - 1];
      
      if (difference >= 0) {
        avgGain = (avgGain * (period - 1) + difference) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - difference) / period;
      }

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
      }
    }

    return rsi[rsi.length - 1];
  }

  // Calculate MACD
  calculateMACD(data: KlineData[]): number {
    const closes = data.map(d => d.close);
    
    if (closes.length < 26) return 0;
    
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    return ema12 - ema26;
  }

  private calculateEMA(data: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
}

export const binanceService = new BinanceService();
export default binanceService;
