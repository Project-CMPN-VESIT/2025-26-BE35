import binanceService, { BinanceSymbol } from './binanceService';
import sentimentService from './sentimentService';
import mlPredictionService from './mlPredictionService';

export interface Prediction {
  id: string;
  timestamp: string;
  horizon: string;
  horizonMinutes: number;
  currentPrice: number;
  predictedPrice: number;
  change: number;
  changePercent: number;
  confidence: number;
  direction: 'up' | 'down';
  sentimentScore: number;
  sentimentImpact: number;
  technicalIndicators: {
    rsi: string;
    macd: string;
    volumeTrend: number;
    volatility: number;
  };
  targetTimestamp: string;
  // After verification
  actualPrice?: number;
  accuracy?: number;
  directionCorrect?: boolean;
}

export interface PerformanceMetrics {
  overall: {
    accuracy: number;
    directionAccuracy: number;
    totalPredictions: number;
  };
  byHorizon: {
    horizon: string;
    accuracy: number;
    directionAccuracy: number;
    sampleSize: number;
  }[];
}

const STORAGE_KEY = 'intellidex_predictions';

class PredictionService {
  private predictions: Prediction[] = [];

  constructor() {
    this.predictions = this.loadPredictions();
  }

  // Load predictions from localStorage
  private loadPredictions(): Prediction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Save predictions to localStorage
  private savePredictions(): void {
    try {
      // Keep only last 500 predictions
      if (this.predictions.length > 500) {
        this.predictions = this.predictions.slice(-500);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.predictions));
    } catch (error) {
      console.error('Error saving predictions:', error);
    }
  }

  // Generate smart algorithmic prediction
  async generatePrediction(
    horizon: string,
    horizonMinutes: number,
    symbol: BinanceSymbol = 'BTCUSDT'
  ): Promise<Prediction | null> {
    try {
      // 1. Get current price
      const currentPrice = await binanceService.getCurrentPrice(symbol);
      if (!currentPrice) throw new Error('Failed to get current price');

      // 2. Get historical data for technical indicators
      const klines = await binanceService.getKlines(symbol, '1h', 100);
      const rsi = binanceService.calculateRSI(klines);
      const macd = binanceService.calculateMACD(klines);

      // 3. Get sentiment score
      const sentiment = await sentimentService.getSentimentScore();

      // 4. Calculate prediction using smart algorithm
      let priceChangePercent = 0;

      // Base random walk (smaller for shorter horizons)
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to +1
      const horizonMultipliers: Record<number, number> = {
        15: 0.002,    // 15min: ±0.2%
        60: 0.005,    // 1hr: ±0.5%
        240: 0.01,    // 4hr: ±1%
        720: 0.02,    // 12hr: ±2%
        1440: 0.03,   // 24hr: ±3%
        4320: 0.05,   // 3day: ±5%
        10080: 0.08   // 7day: ±8%
      };

      priceChangePercent += randomFactor * (horizonMultipliers[horizonMinutes] || 0.01);

      // Technical indicator bias
      if (rsi > 70) priceChangePercent -= 0.001;  // Overbought - expect pullback
      if (rsi < 30) priceChangePercent += 0.001;  // Oversold - expect bounce
      if (macd > 0) priceChangePercent += 0.0005; // Bullish momentum
      if (macd < 0) priceChangePercent -= 0.0005; // Bearish momentum

      // Sentiment bias
      priceChangePercent += sentiment * 0.002;

      // 5. Calculate predicted price
      const predictedPrice = currentPrice * (1 + priceChangePercent);

      // 6. Calculate confidence (decreases with horizon)
      const confidenceBase: Record<number, number> = {
        15: 90,
        60: 83,
        240: 75,
        720: 68,
        1440: 62,
        4320: 55,
        10080: 50
      };

      const baseConfidence = confidenceBase[horizonMinutes] || 60;
      const confidence = Math.round(baseConfidence + (Math.random() * 6 - 3));

      // 7. Create prediction object
      const prediction: Prediction = {
        id: `PRED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        horizon,
        horizonMinutes,
        currentPrice,
        predictedPrice,
        change: predictedPrice - currentPrice,
        changePercent: priceChangePercent * 100,
        confidence: Math.min(95, Math.max(45, confidence)),
        direction: predictedPrice > currentPrice ? 'up' : 'down',
        sentimentScore: sentiment,
        sentimentImpact: sentiment * 0.002 * 100,
        technicalIndicators: {
          rsi: rsi.toFixed(2),
          macd: macd.toFixed(2),
          volumeTrend: 1 + (Math.random() - 0.5) * 0.3,
          volatility: Math.abs(priceChangePercent) * 10
        },
        targetTimestamp: new Date(Date.now() + horizonMinutes * 60000).toISOString()
      };

      // 8. Store prediction
      this.predictions.push(prediction);
      this.savePredictions();

      return prediction;
    } catch (error) {
      console.error('Error generating prediction:', error);
      return null;
    }
  }

  // Generate all horizons — tries real ML model first, falls back to JS algo
  async generateAllPredictions(symbol: BinanceSymbol = 'BTCUSDT'): Promise<Prediction[]> {
    // ── 1. Try the Flask ML API ──────────────────────────────────────────────
    try {
      const currentPrice = await binanceService.getCurrentPrice(symbol);
      const mlPredictions = await mlPredictionService.getMLPredictions(currentPrice);

      if (mlPredictions && mlPredictions.length === 7) {
        // Store them so history / accuracy tracking still works
        this.predictions.push(...mlPredictions);
        this.savePredictions();
        return mlPredictions;
      }
    } catch {
      // ML API unavailable — fall through to JS algo below
    }

    // ── 2. JS algorithmic fallback ───────────────────────────────────────────
    const horizons = [
      { name: '15 minutes', minutes: 15 },
      { name: '1 hour', minutes: 60 },
      { name: '4 hours', minutes: 240 },
      { name: '12 hours', minutes: 720 },
      { name: '24 hours', minutes: 1440 },
      { name: '3 days', minutes: 4320 },
      { name: '7 days', minutes: 10080 }
    ];

    const predictions: Prediction[] = [];
    for (const horizon of horizons) {
      const prediction = await this.generatePrediction(horizon.name, horizon.minutes, symbol);
      if (prediction) predictions.push(prediction);
    }
    return predictions;
  }

  // Check and update old predictions with actual results
  async updatePredictionAccuracy(symbol: BinanceSymbol = 'BTCUSDT'): Promise<void> {
    const currentPrice = await binanceService.getCurrentPrice(symbol);
    if (!currentPrice) return;

    let updated = false;

    for (const prediction of this.predictions) {
      // If prediction target time has passed and we haven't checked accuracy yet
      if (
        new Date(prediction.targetTimestamp) < new Date() &&
        !prediction.actualPrice
      ) {
        prediction.actualPrice = currentPrice;
        prediction.accuracy = (1 - Math.abs(prediction.predictedPrice - currentPrice) / currentPrice) * 100;
        prediction.directionCorrect =
          (prediction.direction === 'up' && currentPrice > prediction.currentPrice) ||
          (prediction.direction === 'down' && currentPrice < prediction.currentPrice);

        updated = true;
      }
    }

    if (updated) {
      this.savePredictions();
    }
  }

  // Get all current predictions
  getPredictions(): Prediction[] {
    return this.predictions;
  }

  // Get prediction history
  getPredictionHistory(limit: number = 100): Prediction[] {
    return this.predictions
      .slice(-limit)
      .reverse();
  }

  // Get recent predictions (not yet verified)
  getActivePredictions(): Prediction[] {
    const now = new Date();
    return this.predictions
      .filter(p => new Date(p.targetTimestamp) > now)
      .reverse();
  }

  // Calculate performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    const completedPredictions = this.predictions.filter(p => p.actualPrice);

    if (completedPredictions.length === 0) {
      return {
        overall: {
          accuracy: 0,
          directionAccuracy: 0,
          totalPredictions: 0
        },
        byHorizon: []
      };
    }

    // Overall metrics
    const totalAccuracy = completedPredictions.reduce((sum, p) => sum + (p.accuracy || 0), 0);
    const totalDirectionCorrect = completedPredictions.filter(p => p.directionCorrect).length;

    // By horizon
    const byHorizon: Record<string, { predictions: Prediction[]; horizon: string }> = {};
    completedPredictions.forEach(p => {
      if (!byHorizon[p.horizon]) {
        byHorizon[p.horizon] = {
          predictions: [],
          horizon: p.horizon
        };
      }
      byHorizon[p.horizon].predictions.push(p);
    });

    const horizonMetrics = Object.values(byHorizon).map(h => ({
      horizon: h.horizon,
      accuracy: h.predictions.reduce((sum, p) => sum + (p.accuracy || 0), 0) / h.predictions.length,
      directionAccuracy: (h.predictions.filter(p => p.directionCorrect).length / h.predictions.length) * 100,
      sampleSize: h.predictions.length
    }));

    return {
      overall: {
        accuracy: totalAccuracy / completedPredictions.length,
        directionAccuracy: (totalDirectionCorrect / completedPredictions.length) * 100,
        totalPredictions: completedPredictions.length
      },
      byHorizon: horizonMetrics
    };
  }

  // Clear all predictions
  clearPredictions(): void {
    this.predictions = [];
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const predictionService = new PredictionService();
export default predictionService;
