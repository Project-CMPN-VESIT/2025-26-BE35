/**
 * Security Monitoring Service
 * Integrates ML fraud detection with blockchain alert recording
 */

const API_BASE = 'http://localhost:5001';

export interface TransactionAnalysis {
  risk_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threat_type: string;
  risk_components: Record<string, number>;
  evidence: string[];
  recommendations: string[];
  blockchain_logged?: boolean;
  alert_id?: number;
  alert_hash?: string;
}

export interface SecurityAlert {
  id: number;
  alert_hash: string;
  timestamp: string;
  transaction_hash?: string;
  wallet_address?: string;
  severity: string;
  risk_score: number;
  threat_type: string;
  blockchain_tx?: string;
  ipfs_cid?: string;
  recorded_on_chain: boolean;
}

export interface WalletRiskProfile {
  wallet_address: string;
  risk_score: number;
  threat_count: number;
  last_threat_timestamp: string;
  blacklist_status: boolean;
}

class SecurityMonitoringService {
  /**
   * Analyze a transaction for fraud risk using ML
   */
  async analyzeTransaction(
    transaction: {
      from_address: string;
      to_address: string;
      value_eth: number;
      gas_price_gwei?: number;
      timestamp?: string;
      tx_hash?: string;
    },
    walletHistory?: any[],
    blockchainContext?: any
  ): Promise<TransactionAnalysis> {
    try {
      const response = await fetch(`${API_BASE}/api/security/analyze-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction,
          wallet_history: walletHistory || [],
          blockchain_context: blockchainContext || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Transaction analysis failed:', error);
      throw error;
    }
  }

  /**
   * Log a security alert to blockchain
   */
  async logSecurityAlert(alertData: {
    wallet_address: string;
    transaction_hash?: string;
    risk_score: number;
    severity: string;
    threat_type: string;
    threat_details?: Record<string, any>;
    evidence?: string[];
    recommendations?: string[];
  }): Promise<{
    alert_id: number;
    alert_hash: string;
    timestamp: string;
    message: string;
  }> {
    try {
      const response = await fetch(`${API_BASE}/api/security/log-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      return {
        alert_id: data.alert_id,
        alert_hash: data.alert_hash,
        timestamp: data.timestamp,
        message: data.message,
      };
    } catch (error) {
      console.error('Security alert logging failed:', error);
      throw error;
    }
  }

  /**
   * Get all alerts for a wallet
   */
  async getWalletAlerts(walletAddress: string): Promise<SecurityAlert[]> {
    try {
      const response = await fetch(`${API_BASE}/api/security/alerts/${walletAddress}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Failed to fetch wallet alerts:', error);
      return [];
    }
  }

  /**
   * Get high-risk wallets
   */
  async getHighRiskWallets(minScore: number = 70): Promise<WalletRiskProfile[]> {
    try {
      const response = await fetch(
        `${API_BASE}/api/security/high-risk-wallets?min_score=${minScore}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.high_risk_wallets || [];
    } catch (error) {
      console.error('Failed to fetch high-risk wallets:', error);
      return [];
    }
  }

  /**
   * Get recent security alerts
   */
  async getRecentAlerts(limit: number = 10): Promise<SecurityAlert[]> {
    try {
      const response = await fetch(
        `${API_BASE}/api/security/recent-alerts?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.recent_alerts || [];
    } catch (error) {
      console.error('Failed to fetch recent alerts:', error);
      return [];
    }
  }

  /**
   * Get severity color
   */
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'text-destructive';
      case 'HIGH':
        return 'text-chart-bearish';
      case 'MEDIUM':
        return 'text-warning';
      case 'LOW':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  }

  /**
   * Get severity background color
   */
  getSeverityBg(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-destructive/20 border-destructive/30';
      case 'HIGH':
        return 'bg-chart-bearish/20 border-chart-bearish/30';
      case 'MEDIUM':
        return 'bg-warning/20 border-warning/30';
      case 'LOW':
        return 'bg-success/20 border-success/30';
      default:
        return 'bg-muted/20 border-muted/30';
    }
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
export default securityMonitoringService;
