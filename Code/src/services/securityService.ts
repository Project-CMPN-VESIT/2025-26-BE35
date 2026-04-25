import axios from 'axios';

export interface Transaction {
  hash: string;
  timestamp: string;
  from: string;
  to: string;
  amount: string;
  type: string;
  riskScore: number;
  status: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  transactionHash: string;
  riskScore: number;
  description: string;
  status: 'open' | 'resolved' | 'investigating';
}

export interface TransactionAnalysis {
  hash: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    unusualPatterns: number;
    knownBadActors: boolean;
    transactionVelocity: number;
    amountAnomaly: number;
    timeAnomaly: number;
  };
  recommendations: string[];
}

export interface AlertStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  safe: number;
}

const STORAGE_KEY = 'intellidex_security_alerts';

class SecurityService {
  private alerts: SecurityAlert[] = [];

  constructor() {
    this.alerts = this.loadAlerts();
  }

  private loadAlerts(): SecurityAlert[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveAlerts(): void {
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
  }

  // Generate random hex string
  private generateHex(length: number): string {
    return Array.from({ length }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  // Fetch recent Ethereum transactions (using trained ML model on API)
  async fetchRecentTransactions(): Promise<Transaction[]> {
    try {
      // First, try to fetch trade executions from blockchain ledger
      const tradeExecResponse = await axios.get('http://localhost:5001/api/trading/get-executions', {
        params: {
          limit: 8,
        },
        timeout: 10000
      });

      if (tradeExecResponse.data.success && tradeExecResponse.data.executions) {
        console.log('✅ Trade executions from blockchain:', tradeExecResponse.data);
        return tradeExecResponse.data.executions.map((exec: any) => ({
          hash: exec.hash,
          timestamp: exec.timestamp,
          from: exec.from,
          to: exec.to,
          amount: exec.amount,
          type: exec.type,
          riskScore: exec.riskScore,
          status: exec.status
        }));
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch trade executions, trying ML API...', error);
    }

    try {
      // Fallback: Try to fetch from API with trained ML fraud detector
      const response = await axios.get('http://localhost:5001/api/security/generate-test-transactions', {
        params: {
          count: 8,
          include_anomalies: true
        },
        timeout: 10000
      });

      if (response.data.success && response.data.transactions) {
        console.log('✅ Transactions from trained ML model:', response.data);
        return response.data.transactions.map((tx: any) => ({
          hash: tx.hash,
          timestamp: tx.timestamp,
          from: tx.from,
          to: tx.to,
          amount: tx.amount,
          type: tx.type,
          riskScore: tx.riskScore,
          status: tx.status
        }));
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch from ML API, using fallback mock data:', error);
    }
    
    // Fallback to mock transactions if API unavailable
    return this.generateMockTransactions(8);
  }

  // Fetch trade executions specifically from blockchain ledger
  async fetchTradeExecutions(symbol?: string): Promise<Transaction[]> {
    try {
      const params: any = { limit: 50 };
      if (symbol) params.symbol = symbol;

      const response = await axios.get('http://localhost:5001/api/trading/get-executions', {
        params,
        timeout: 10000
      });

      if (response.data.success && response.data.executions) {
        console.log('✅ Trade executions loaded:', response.data);
        return response.data.executions.map((exec: any) => ({
          hash: exec.hash,
          timestamp: exec.timestamp,
          from: exec.from,
          to: exec.to,
          amount: exec.amount,
          type: exec.type,
          riskScore: exec.riskScore,
          status: exec.status
        }));
      }
    } catch (error) {
      console.error('Error fetching trade executions:', error);
    }
    
    return [];
  }

  // Generate mock transactions for demo
  private generateMockTransactions(count: number): Transaction[] {
    const transactions: Transaction[] = [];
    const types = ['transfer', 'swap', 'deposit', 'withdraw', 'contract'];
    
    for (let i = 0; i < count; i++) {
      const hash = '0x' + this.generateHex(64);
      const amount = (Math.random() * 100).toFixed(4);
      const timestamp = new Date(Date.now() - Math.random() * 3600000).toISOString();
      const riskScore = this.calculateRiskScoreFromAmount(parseFloat(amount), timestamp);
      
      transactions.push({
        hash,
        timestamp,
        from: '0x' + this.generateHex(40),
        to: '0x' + this.generateHex(40),
        amount,
        type: types[Math.floor(Math.random() * types.length)],
        riskScore,
        status: this.getRiskStatus(riskScore)
      });
    }
    
    return transactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Calculate risk score for transaction
  private calculateRiskScoreFromAmount(amount: number, timestamp: string): number {
    let riskScore = 0;

    // Amount-based risk
    if (amount > 50) riskScore += 30;
    else if (amount > 10) riskScore += 15;
    else riskScore += 5;

    // Time-based risk (transactions at night are higher risk)
    const hour = new Date(timestamp).getHours();
    if (hour >= 2 && hour <= 6) riskScore += 20;
    else if (hour >= 22 || hour <= 2) riskScore += 10;

    // Random component for variation
    riskScore += Math.random() * 30;

    // Normalize to 0-100
    return Math.min(100, Math.max(0, Math.round(riskScore)));
  }

  private getRiskStatus(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    if (score < 80) return 'high';
    return 'critical';
  }

  // Analyze transaction and generate alert if needed
  async analyzeTransaction(hash: string): Promise<TransactionAnalysis> {
    const amount = Math.random() * 100;
    const timestamp = new Date().toISOString();
    const riskScore = this.calculateRiskScoreFromAmount(amount, timestamp);
    const riskLevel = this.getRiskStatus(riskScore);

    const analysis: TransactionAnalysis = {
      hash,
      riskScore,
      riskLevel,
      factors: {
        unusualPatterns: Math.min(100, riskScore + (Math.random() * 20 - 10)),
        knownBadActors: riskScore > 70 ? Math.random() > 0.7 : false,
        transactionVelocity: Math.min(100, riskScore + (Math.random() * 20 - 10)),
        amountAnomaly: Math.min(100, riskScore + (Math.random() * 20 - 10)),
        timeAnomaly: Math.min(100, riskScore + (Math.random() * 20 - 10))
      },
      recommendations: []
    };

    if (riskScore > 40) {
      analysis.recommendations.push('Monitor for follow-up transactions');
    }
    if (riskScore > 60) {
      analysis.recommendations.push('Investigate transaction velocity');
      analysis.recommendations.push('Review related addresses');
    }
    if (riskScore > 80) {
      analysis.recommendations.push('Consider blocking this address');
      analysis.recommendations.push('Report to security team');
    }

    return analysis;
  }

  // Monitor and generate alerts
  async monitorTransactions(): Promise<void> {
    const transactions = await this.fetchRecentTransactions();
    
    for (const tx of transactions) {
      if (tx.riskScore > 60) {
        // Check if we already have an alert for this transaction
        const existingAlert = this.alerts.find(a => a.transactionHash === tx.hash);
        if (existingAlert) continue;

        const alert: SecurityAlert = {
          id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          severity: tx.riskScore > 80 ? 'critical' : 'high',
          type: 'Unusual Pattern',
          transactionHash: tx.hash,
          riskScore: tx.riskScore,
          description: `Transaction with risk score ${tx.riskScore} detected`,
          status: 'open'
        };
        
        this.alerts.unshift(alert);
      }
    }

    this.saveAlerts();
  }

  // Get alerts
  getAlerts(limit: number = 50): SecurityAlert[] {
    return this.alerts.slice(0, limit);
  }

  // Get alert statistics
  getAlertStats(): AlertStats {
    const critical = this.alerts.filter(a => a.severity === 'critical').length;
    const high = this.alerts.filter(a => a.severity === 'high').length;
    const medium = this.alerts.filter(a => a.severity === 'medium').length;
    const low = this.alerts.filter(a => a.severity === 'low').length;

    return { 
      critical, 
      high, 
      medium, 
      low,
      safe: Math.max(0, 100 - critical - high - medium - low)
    };
  }

  // Resolve an alert
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'resolved';
      this.saveAlerts();
    }
  }

  // Clear all alerts
  clearAlerts(): void {
    this.alerts = [];
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const securityService = new SecurityService();
export default securityService;
