import { useState, useEffect } from "react";
import { Shield, AlertTriangle, AlertCircle, CheckCircle, Search, RefreshCw, ExternalLink, Loader2, Zap, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useStore } from "@/store/useStore";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { securityMonitoringService } from "@/services/securityMonitoringService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SecurityMonitor() {
  const [searchHash, setSearchHash] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [blockchainAlerts, setBlockchainAlerts] = useState<any[]>([]);
  const [highRiskWallets, setHighRiskWallets] = useState<any[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  const { alerts, transactions, alertStats } = useStore();
  const { refreshSecurityData, analyzeTransaction } = useRealTimeData();

  // Load blockchain alerts on component mount
  useEffect(() => {
    loadBlockchainAlerts();
    const interval = setInterval(loadBlockchainAlerts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadBlockchainAlerts = async () => {
    setIsLoadingAlerts(true);
    try {
      const recent = await securityMonitoringService.getRecentAlerts(5);
      setBlockchainAlerts(recent);

      const highRisk = await securityMonitoringService.getHighRiskWallets(70);
      setHighRiskWallets(highRisk);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const riskDistribution = alertStats ? [
    { name: "Safe", value: alertStats.safe, color: "hsl(var(--success))" },
    { name: "Medium", value: alertStats.medium, color: "hsl(var(--warning))" },
    { name: "High", value: alertStats.high, color: "hsl(var(--chart-bearish))" },
    { name: "Critical", value: alertStats.critical, color: "hsl(var(--destructive))" },
  ] : [];

  const threatTrend = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    threats: Math.floor(Math.random() * 20) + 5,
  }));

  const threatTypes = [
    { type: "Phishing", count: 45 },
    { type: "Unusual Patterns", count: alerts.filter(a => a.type === 'Unusual Pattern').length || 32 },
    { type: "High-Value Movements", count: 28 },
    { type: "Known Bad Actors", count: 12 },
    { type: "Time Anomalies", count: 8 },
  ];

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-success";
    if (score < 60) return "text-warning";
    if (score < 80) return "text-chart-bearish";
    return "text-destructive";
  };

  const getRiskBg = (score: number) => {
    if (score < 30) return "bg-success/20";
    if (score < 60) return "bg-warning/20";
    if (score < 80) return "bg-chart-bearish/20";
    return "bg-destructive/20";
  };

  const handleAnalyze = async () => {
    const hash = searchHash || searchAddress;
    if (!hash) return;

    setIsAnalyzing(true);
    try {
      // Analyze with ML fraud detection
      const analysis = await securityMonitoringService.analyzeTransaction({
        from_address: hash.startsWith('0x') && hash.length === 42 ? hash : '',
        to_address: '',
        value_eth: 0,
        timestamp: new Date().toISOString(),
      });

      setAnalysisResult(analysis);
      toast.success(`Analysis complete - Risk Score: ${analysis.risk_score}`);

      // If blockchain logging occurred, refresh alerts
      if (analysis.blockchain_logged) {
        await loadBlockchainAlerts();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefresh = async () => {
    await refreshSecurityData();
    await loadBlockchainAlerts();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Security Monitor</h1>
        <p className="text-muted-foreground text-sm">
          Real-time blockchain transaction security analysis
        </p>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{alertStats?.critical || 0}</div>
                <div className="text-xs text-muted-foreground">Critical Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-chart-bearish/10 border-chart-bearish/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-chart-bearish/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-chart-bearish" />
              </div>
              <div>
                <div className="text-2xl font-bold text-chart-bearish">{alertStats?.high || 0}</div>
                <div className="text-xs text-muted-foreground">High Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{alertStats?.medium || 0}</div>
                <div className="text-xs text-muted-foreground">Medium Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/10 border-success/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{alertStats?.safe || 0}</div>
                <div className="text-xs text-muted-foreground">Safe Transactions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Monitor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Real-Time Transaction Monitor
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Timestamp</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">TX Hash</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Type</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Risk Score</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{tx.type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{tx.amount} ETH</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Progress 
                              value={tx.riskScore} 
                              className={cn("w-16 h-2", getRiskBg(tx.riskScore))}
                            />
                            <span className={cn("font-mono text-sm font-semibold", getRiskColor(tx.riskScore))}>
                              {tx.riskScore}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={cn(
                            tx.status === "low" && "bg-success/20 text-success border-success/30",
                            tx.status === "medium" && "bg-warning/20 text-warning border-warning/30",
                            tx.status === "high" && "bg-chart-bearish/20 text-chart-bearish border-chart-bearish/30",
                            tx.status === "critical" && "bg-destructive/20 text-destructive border-destructive/30"
                          )}>
                            {tx.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Risk Analysis */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Transaction Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="transaction">
                <TabsList>
                  <TabsTrigger value="transaction">Analyze Transaction</TabsTrigger>
                  <TabsTrigger value="address">Analyze Address</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transaction" className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={searchHash}
                        onChange={(e) => setSearchHash(e.target.value)}
                        placeholder="Paste transaction hash..." 
                        className="pl-9 font-mono"
                      />
                    </div>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="address" className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        placeholder="Paste ETH address..." 
                        className="pl-9 font-mono"
                      />
                    </div>
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {analysisResult && (
                <div className="p-6 rounded-lg bg-muted/30 space-y-4 animate-fade-in border border-border">
                  {/* Risk Score Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-lg font-semibold">ML Risk Score</span>
                      {analysisResult.blockchain_logged && (
                        <div className="text-xs text-success mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Recorded on blockchain
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "text-4xl font-bold font-mono",
                      getRiskColor(analysisResult.risk_score)
                    )}>
                      {analysisResult.risk_score}/100
                    </div>
                  </div>
                  
                  <Progress value={analysisResult.risk_score} className={cn("h-3", getRiskBg(analysisResult.risk_score))} />
                  
                  {/* Severity & Threat Type */}
                  <div className="flex items-center gap-3 py-3 border-y border-border">
                    <Badge className={cn(
                      analysisResult.severity === 'CRITICAL' && "bg-destructive",
                      analysisResult.severity === 'HIGH' && "bg-chart-bearish",
                      analysisResult.severity === 'MEDIUM' && "bg-warning",
                      analysisResult.severity === 'LOW' && "bg-success",
                      "text-white"
                    )}>
                      {analysisResult.severity}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {analysisResult.threat_type}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {/* ML Risk Components */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Risk Components
                      </h4>
                      <div className="space-y-2 text-sm">
                        {analysisResult.risk_components && Object.entries(analysisResult.risk_components).map(([key, value]: any) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress value={(value / 40) * 100} className="w-16 h-1.5" />
                              <span className="font-mono text-xs font-semibold">{value.toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Evidence & Recommendations */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Evidence & Actions</h4>
                      <div className="text-sm text-muted-foreground space-y-2">
                        {analysisResult.evidence && analysisResult.evidence.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">Evidence:</p>
                            {analysisResult.evidence.slice(0, 3).map((e: string, i: number) => (
                              <p key={i} className="text-xs">• {e}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Recommendations */}
                  {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                    <div className="p-3 rounded bg-primary/10 border border-primary/20">
                      <h4 className="font-semibold text-sm text-primary mb-2">Recommended Actions:</h4>
                      <ul className="text-sm space-y-1">
                        {analysisResult.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-primary/80">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Blockchain Info */}
                  {analysisResult.blockchain_logged && (
                    <div className="p-3 rounded bg-success/10 border border-success/20 text-xs">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                        <div>
                          <p className="font-semibold text-success mb-1">Blockchain Recording</p>
                          <p className="text-success/70">
                            Alert ID: <span className="font-mono">{analysisResult.alert_id}</span>
                          </p>
                          <p className="text-success/70">
                            Hash: <span className="font-mono truncate">{analysisResult.alert_hash?.substring(0, 16)}...</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Analytics */}
        <div className="space-y-6">
          {/* Blockchain Security Alerts */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Blockchain-Recorded Alerts
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={loadBlockchainAlerts}
                  disabled={isLoadingAlerts}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAlerts ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ML-detected fraud alerts recorded on-chain
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {blockchainAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  {isLoadingAlerts ? 'Loading alerts...' : 'No critical alerts detected'}
                </p>
              ) : (
                blockchainAlerts.slice(0, 4).map((alert, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "p-3 rounded-lg border",
                      alert.severity === 'CRITICAL' && "bg-destructive/10 border-destructive/30",
                      alert.severity === 'HIGH' && "bg-chart-bearish/10 border-chart-bearish/30",
                      alert.severity === 'MEDIUM' && "bg-warning/10 border-warning/30",
                      alert.severity === 'LOW' && "bg-success/10 border-success/30"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            className={cn(
                              alert.severity === 'CRITICAL' && "bg-destructive text-white",
                              alert.severity === 'HIGH' && "bg-chart-bearish text-white",
                              alert.severity === 'MEDIUM' && "bg-warning text-white",
                              alert.severity === 'LOW' && "bg-success text-white"
                            )}
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.threat_type || 'Unknown Threat'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Risk: <span className="font-mono font-semibold">{alert.risk_score}/100</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {alert.ipfs_cid && (
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* High-Risk Wallets */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">High-Risk Wallets</CardTitle>
              <p className="text-xs text-muted-foreground mt-2">
                Wallets flagged by ML analysis
              </p>
            </CardHeader>
            <CardContent>
              {highRiskWallets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No high-risk wallets</p>
              ) : (
                <div className="space-y-2">
                  {highRiskWallets.slice(0, 5).map((wallet, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono truncate text-muted-foreground">
                          {wallet.wallet_address?.substring(0, 10)}...{wallet.wallet_address?.substring(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {wallet.threat_count} threats
                        </p>
                      </div>
                      <Badge className={cn(
                        wallet.risk_score >= 85 && "bg-destructive",
                        wallet.risk_score >= 70 && wallet.risk_score < 85 && "bg-chart-bearish",
                        wallet.risk_score < 70 && "bg-warning",
                      )}>
                        {wallet.risk_score?.toFixed(0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {riskDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Threats Over Time */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Threats Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={threatTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="day" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="threats" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Threat Types */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Top Threat Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={threatTypes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="type" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
