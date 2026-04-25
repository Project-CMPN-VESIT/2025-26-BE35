import { useState, useEffect, useCallback } from "react";

export type CoinId = "bitcoin" | "ethereum" | "solana" | "binancecoin" | "ripple" | "cardano";

export const COINS: { id: CoinId; symbol: string; name: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
];

export type TimeRange = "1m" | "5m" | "15m" | "1h" | "4h" | "1D" | "1W" | "1M";

export interface OHLCData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CryptoPrice {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
}

interface UseCryptoDataReturn {
  currentPrice: CryptoPrice | null;
  ohlcData: OHLCData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Map time ranges to CoinGecko days parameter
const timeRangeToDays: Record<TimeRange, number> = {
  "1m": 1,
  "5m": 1,
  "15m": 1,
  "1h": 1,
  "4h": 7,
  "1D": 30,
  "1W": 90,
  "1M": 365,
};

// Generate realistic OHLC data based on current price
function generateOHLCData(
  basePrice: number,
  timeRange: TimeRange,
  volatility: number = 0.02
): OHLCData[] {
  const dataPoints = getDataPointsForRange(timeRange);
  const intervalMs = getIntervalMs(timeRange);
  const now = Date.now();
  const data: OHLCData[] = [];
  
  let currentPrice = basePrice * (1 - volatility * dataPoints * 0.01);
  
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i) * intervalMs;
    const change = (Math.random() - 0.48) * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    const volume = 1000000 + Math.random() * 5000000;
    
    data.push({
      time: new Date(timestamp).toISOString(),
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });
    
    currentPrice = close;
  }
  
  return data;
}

function getDataPointsForRange(timeRange: TimeRange): number {
  switch (timeRange) {
    case "1m": return 60;
    case "5m": return 60;
    case "15m": return 96;
    case "1h": return 24;
    case "4h": return 42;
    case "1D": return 30;
    case "1W": return 52;
    case "1M": return 12;
    default: return 60;
  }
}

function getIntervalMs(timeRange: TimeRange): number {
  switch (timeRange) {
    case "1m": return 60 * 1000;
    case "5m": return 5 * 60 * 1000;
    case "15m": return 15 * 60 * 1000;
    case "1h": return 60 * 60 * 1000;
    case "4h": return 4 * 60 * 60 * 1000;
    case "1D": return 24 * 60 * 60 * 1000;
    case "1W": return 7 * 24 * 60 * 60 * 1000;
    case "1M": return 30 * 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

export function useCryptoData(
  coinId: CoinId,
  timeRange: TimeRange
): UseCryptoDataReturn {
  const [currentPrice, setCurrentPrice] = useState<CryptoPrice | null>(null);
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch current price from CoinGecko
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      );
      
      if (!priceResponse.ok) {
        throw new Error("Failed to fetch price data");
      }
      
      const priceData = await priceResponse.json();
      const coinData = priceData[coinId];
      
      if (!coinData) {
        throw new Error("Coin not found");
      }

      // Fetch OHLC data from CoinGecko
      const days = timeRangeToDays[timeRange];
      const ohlcResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
      );
      
      let ohlc: OHLCData[] = [];
      
      if (ohlcResponse.ok) {
        const ohlcRaw = await ohlcResponse.json();
        if (Array.isArray(ohlcRaw) && ohlcRaw.length > 0) {
          ohlc = ohlcRaw.map((item: number[]) => ({
            time: new Date(item[0]).toISOString(),
            timestamp: item[0],
            open: item[1],
            high: item[2],
            low: item[3],
            close: item[4],
            volume: 1000000 + Math.random() * 5000000, // CoinGecko OHLC doesn't include volume
          }));
        }
      }
      
      // If OHLC fetch failed or returned empty, generate synthetic data
      if (ohlc.length === 0) {
        ohlc = generateOHLCData(coinData.usd, timeRange);
      }

      // Fetch 24h high/low from market data
      const marketResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
      );
      
      let high24h = coinData.usd * 1.02;
      let low24h = coinData.usd * 0.98;
      
      if (marketResponse.ok) {
        const marketData = await marketResponse.json();
        high24h = marketData.market_data?.high_24h?.usd || high24h;
        low24h = marketData.market_data?.low_24h?.usd || low24h;
      }

      setCurrentPrice({
        price: coinData.usd,
        change24h: coinData.usd_24h_change || 0,
        high24h,
        low24h,
        volume24h: coinData.usd_24h_vol || 0,
        marketCap: coinData.usd_market_cap || 0,
      });

      setOhlcData(ohlc);
    } catch (err) {
      console.error("Error fetching crypto data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      
      // Fallback to generated data
      const fallbackPrices: Record<CoinId, number> = {
        bitcoin: 52000 + Math.random() * 1000,
        ethereum: 3200 + Math.random() * 100,
        solana: 120 + Math.random() * 10,
        binancecoin: 320 + Math.random() * 20,
        ripple: 0.52 + Math.random() * 0.05,
        cardano: 0.45 + Math.random() * 0.05,
      };
      
      const fallbackPrice = fallbackPrices[coinId];
      
      setCurrentPrice({
        price: fallbackPrice,
        change24h: (Math.random() - 0.5) * 10,
        high24h: fallbackPrice * 1.03,
        low24h: fallbackPrice * 0.97,
        volume24h: 1000000000 + Math.random() * 500000000,
        marketCap: fallbackPrice * 19000000,
      });
      
      setOhlcData(generateOHLCData(fallbackPrice, timeRange));
    } finally {
      setIsLoading(false);
    }
  }, [coinId, timeRange]);

  useEffect(() => {
    fetchData();
    
    // Set up polling for live updates (every 30 seconds)
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    currentPrice,
    ohlcData,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Technical indicator calculations
export function calculateMA(data: OHLCData[], period: number): (number | null)[] {
  return data.map((_, index) => {
    if (index < period - 1) return null;
    const slice = data.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, d) => acc + d.close, 0);
    return sum / period;
  });
}

export function calculateEMA(data: OHLCData[], period: number): (number | null)[] {
  const multiplier = 2 / (period + 1);
  const ema: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      // First EMA is SMA
      const sum = data.slice(0, period).reduce((acc, d) => acc + d.close, 0);
      ema.push(sum / period);
    } else {
      const prevEma = ema[i - 1];
      if (prevEma !== null) {
        ema.push((data[i].close - prevEma) * multiplier + prevEma);
      } else {
        ema.push(null);
      }
    }
  }
  
  return ema;
}

export function calculateRSI(data: OHLCData[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsi.push(null);
      continue;
    }
    
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
    
    if (i < period) {
      rsi.push(null);
    } else {
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return rsi;
}

export interface MACDData {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function calculateMACD(
  data: OHLCData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData[] {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine: (number | null)[] = fastEMA.map((fast, i) => {
    const slow = slowEMA[i];
    if (fast === null || slow === null) return null;
    return fast - slow;
  });
  
  // Calculate signal line (EMA of MACD)
  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalMultiplier = 2 / (signalPeriod + 1);
  const signalLine: (number | null)[] = [];
  let signalEma: number | null = null;
  
  let validCount = 0;
  for (let i = 0; i < macdLine.length; i++) {
    const m = macdLine[i];
    if (m === null) {
      signalLine.push(null);
    } else {
      validCount++;
      if (validCount < signalPeriod) {
        signalLine.push(null);
      } else if (validCount === signalPeriod) {
        signalEma = validMacd.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
        signalLine.push(signalEma);
      } else {
        signalEma = (m - signalEma!) * signalMultiplier + signalEma!;
        signalLine.push(signalEma);
      }
    }
  }
  
  return macdLine.map((macd, i) => ({
    macd,
    signal: signalLine[i],
    histogram: macd !== null && signalLine[i] !== null ? macd - signalLine[i]! : null,
  }));
}
