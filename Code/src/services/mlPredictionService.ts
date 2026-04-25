/**
 * ML Prediction Service
 * Communicates with the Flask API server (api_server.py on port 5001)
 * to retrieve real Transformer model predictions.
 *
 * Returns null on any error so callers can fall back gracefully.
 */

import { Prediction } from './predictionService';

const API_URL = 'http://localhost:5001';
const TIMEOUT = 4000; // 4 seconds — never block the UI

export interface MLHealthStatus {
  available: boolean;
  directionAccuracy: number | null;
  modelVersion: string | null;
  dataAgeHours: number | null;
  dataLastRow: string | null;
  dataLastPrice: number | null;
  modelUpdatedAt: string | null;
  device: string | null;
}

export interface MLModelPerformance {
  directionAccuracy: number;
  upAccuracy: number;
  downAccuracy: number;
  mae: number;
  rmse: number;
  totalPredictions: number;
  loggedDirAcc: number | null;
  loggedRmse: number | null;
  lastLogDate: string | null;
  modelVersion: string | null;
  modelLastTrained: string | null;
  trainedDirAcc: number | null;
}

export interface BlockchainLog {
  hash: string;
  timestamp: string;
  price: number;
  ipfs_cid: string;
  tx_hash: string;
}

// ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// ─────────────────────────────────────────────────────────────────

class MLPredictionService {
  // ── Health check ────────────────────────────────────────────────

  async checkHealth(): Promise<MLHealthStatus> {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/health`);
      const data = await res.json();

      if (!res.ok || data.status !== 'ok') {
        return this._offlineStatus();
      }

      return {
        available: true,
        directionAccuracy: data.directionAccuracy ?? null,
        modelVersion: data.modelVersion ?? null,
        dataAgeHours: data.data?.ageHours ?? null,
        dataLastRow: data.data?.lastRow ?? null,
        dataLastPrice: data.data?.lastPrice ?? null,
        modelUpdatedAt: data.modelUpdatedAt ?? null,
        device: data.device ?? null,
      };
    } catch {
      return this._offlineStatus();
    }
  }

  private _offlineStatus(): MLHealthStatus {
    return {
      available: false,
      directionAccuracy: null,
      modelVersion: null,
      dataAgeHours: null,
      dataLastRow: null,
      dataLastPrice: null,
      modelUpdatedAt: null,
      device: null,
    };
  }

  // ── ML Predictions ───────────────────────────────────────────────

  /**
   * Fetches 7-horizon predictions from the Flask ML server.
   * Overrides `currentPrice` with the live Binance price so the UI chart
   * aligns with real market prices even though the model was trained on
   * older data.
   */
  async getMLPredictions(liveCurrentPrice: number | null): Promise<Prediction[] | null> {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/predictions`);
      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.predictions)) {
        return null;
      }

      return data.predictions.map((p: any): Prediction => {
        // Use live Binance price as the reference for change calculations
        const currentPrice = liveCurrentPrice ?? p.currentPrice;
        const predictedAdjusted = liveCurrentPrice
          ? liveCurrentPrice * (1 + p.changePercent / 100)
          : p.predictedPrice;
        const change = predictedAdjusted - currentPrice;
        const changePercent = currentPrice ? (change / currentPrice) * 100 : p.changePercent;

        return {
          id: p.id,
          timestamp: p.timestamp,
          horizon: p.horizon,
          horizonMinutes: p.horizonMinutes,
          currentPrice,
          predictedPrice: Math.round(predictedAdjusted * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 10000) / 10000,
          confidence: p.confidence,
          direction: p.direction as 'up' | 'down',
          sentimentScore: p.sentimentScore,
          sentimentImpact: p.sentimentImpact,
          technicalIndicators: {
            rsi: p.technicalIndicators?.rsi ?? '50.0',
            macd: p.technicalIndicators?.macd ?? '0.0',
            volumeTrend: p.technicalIndicators?.volumeTrend ?? 1.0,
            volatility: p.technicalIndicators?.volatility ?? 0.3,
          },
          targetTimestamp: p.targetTimestamp,
          // Extra field — lets the UI know this came from the ML model
          // Cast to any since Prediction interface doesn't define it yet
          ...(p.source ? { source: p.source } : {}),
        } as Prediction & { source?: string };
      });
    } catch {
      return null;
    }
  }

  // ── Model Performance ─────────────────────────────────────────────

  async getModelPerformance(): Promise<MLModelPerformance | null> {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/model-performance`);
      const data = await res.json();

      if (!res.ok || !data.success) return null;

      return {
        directionAccuracy: data.directionAccuracy ?? 0,
        upAccuracy: data.upAccuracy ?? 0,
        downAccuracy: data.downAccuracy ?? 0,
        mae: data.mae ?? 0,
        rmse: data.rmse ?? 0,
        totalPredictions: data.totalPredictions ?? 0,
        loggedDirAcc: data.loggedDirAcc ?? null,
        loggedRmse: data.loggedRmse ?? null,
        lastLogDate: data.lastLogDate ?? null,
        modelVersion: data.modelVersion ?? null,
        modelLastTrained: data.modelLastTrained ?? null,
        trainedDirAcc: data.trainedDirAcc ?? null,
      };
    } catch {
      return null;
    }
  }
  // ── Blockchain Logs ───────────────────────────────────────────────

  async getBlockchainLogs(): Promise<BlockchainLog[]> {
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/blockchain/logs`);
      const data = await res.json();

      if (!res.ok || !data.success) return [];

      return data.logs || [];
    } catch {
      return [];
    }
  }
}

export const mlPredictionService = new MLPredictionService();
export default mlPredictionService;
