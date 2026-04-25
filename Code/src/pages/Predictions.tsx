import { TrendingUp, TrendingDown, Clock, Download, Search, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SentimentGauge } from "@/components/shared/SentimentGauge";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart
} from "recharts";
import { useStore } from "@/store/useStore";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { useAutoPredictionUpdates } from "@/hooks/useAutoPredictionUpdates";
import { cn } from "@/lib/utils";
import { Brain, AlertTriangle } from "lucide-react";
import BlockchainVerification from "@/components/dashboard/BlockchainVerification";
import PredictionAutoUpdateSettings from "@/components/dashboard/PredictionAutoUpdateSettings";
import { useState, useEffect } from "react";

export default function Predictions() {
  const { 
    predictions, 
    currentPrice, 
    priceStats, 
    sentiment, 
    performanceMetrics, 
    mlAvailable, 
    mlModelInfo,
    autoUpdateEnabled,
    autoUpdateInterval,
    autoLogToBlockchain,
    lastBlockchainUpdate,
    setLastBlockchainUpdate
  } = useStore();
  const { refreshPredictions } = useRealTimeData();
  const { updatePredictions } = useAutoPredictionUpdates({ 
    enabled: autoUpdateEnabled, 
    intervalMinutes: autoUpdateInterval,
    autoLogToBlockchain: autoLogToBlockchain
  });

  const [isManualUpdating, setIsManualUpdating] = useState(false);
  const [nextUpdateIn, setNextUpdateIn] = useState<number>(autoUpdateInterval * 60);

  // Track countdown to next auto update
  useEffect(() => {
    if (!autoUpdateEnabled) return;

    const timer = setInterval(() => {
      setNextUpdateIn((prev) => {
        if (prev <= 1) {
          return autoUpdateInterval * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoUpdateEnabled, autoUpdateInterval]);

  // Manual trigger
  const handleManualUpdate = async () => {
    setIsManualUpdating(true);
    try {
      await updatePredictions();
      setLastBlockchainUpdate(new Date().toISOString());
      setNextUpdateIn(autoUpdateInterval * 60);
    } finally {
      setIsManualUpdating(false);
    }
  };

  // Use store predictions or generate demo display
  const displayPredictions = predictions.length > 0 ? predictions : [];

  // Generate chart data for prediction visualization
  const chartData = [
    { time: "Now", actual: currentPrice || 0 },
    ...displayPredictions.map(p => ({
      time: p.horizon.replace(' minutes', 'm').replace(' hour', 'h').replace(' hours', 'h').replace(' days', 'd').replace(' day', 'd'),
      predicted: p.predictedPrice,
    }))
  ];

  // Get recent verified predictions from history
  const verifiedPredictions = predictions
    .filter(p => p.actualPrice)
    .slice(-5)
    .reverse();

  const sentimentScore = sentiment?.score || 0;
  const latestRSI = displayPredictions[0]?.technicalIndicators?.rsi || '50.0';
  const latestMACD = displayPredictions[0]?.technicalIndicators?.macd || '0.0';
  const volatility = displayPredictions[0]?.technicalIndicators?.volatility || 0;

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-fade-in max-w-[1800px] mx-auto">
      {/* Hero Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">AI-Powered Predictions</h1>
            <p className="text-muted-foreground">
              Multi-horizon price predictions with sentiment analysis & blockchain verification
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {/* ML Model Status Badge */}
              {mlAvailable ? (
                <Badge className="bg-success/15 text-success border-success/30 gap-1.5 px-3 py-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  Transformer Model
                  {mlModelInfo?.dataAgeHours !== null && (
                    <span className="text-success/70 text-[10px] ml-1">
                      · data {mlModelInfo?.dataAgeHours?.toFixed(0)}h ago
                    </span>
                  )}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1.5 px-3 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Algorithmic Fallback
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={refreshPredictions}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Predictions
              </Button>
            </div>

            {/* Auto-Update Status */}
            {autoUpdateEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-primary/15 text-primary border-primary/30 gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Auto-Update: {autoUpdateInterval}m
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Next: {Math.floor(nextUpdateIn / 60)}:{String(nextUpdateIn % 60).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-border rounded-lg">
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground mb-1">Network & Blockchain</div>
            <div className="text-xs text-muted-foreground">
              Predictions are automatically logged to blockchain every {autoUpdateInterval} minutes
              {lastBlockchainUpdate && (
                <span>. Last update: {new Date(lastBlockchainUpdate).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <PredictionAutoUpdateSettings />
            <Button 
              size="sm" 
              onClick={handleManualUpdate}
              disabled={isManualUpdating}
              className="gap-2"
              variant="secondary"
            >
              <Zap className="w-4 h-4" />
              {isManualUpdating ? 'Updating...' : 'Update Now'}
            </Button>
          </div>
        </div>
      </div>

      {/* Current Market Status */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Price Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Price</h3>
              <PriceDisplay
                price={currentPrice || 0}
                changePercent={priceStats?.changePercent24h || 0}
                change={priceStats?.change24h || 0}
                size="xl"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">24h High:</span>
                  <span className="ml-2 font-mono text-success">${(priceStats?.high24h || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">24h Low:</span>
                  <span className="ml-2 font-mono text-destructive">${(priceStats?.low24h || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Volume:</span>
                  <span className="ml-2 font-mono">{((priceStats?.volume24h || 0) / 1000).toFixed(1)}K</span>
                </div>
              </div>
            </div>

            {/* Center: Sentiment */}
            <div className="flex flex-col items-center justify-center space-y-2 border-x border-border px-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Market Sentiment</h3>
              <SentimentGauge score={sentimentScore} size="lg" />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Momentum: <span className={sentimentScore > 0 ? "text-success" : "text-destructive"}>{sentimentScore > 0 ? '+' : ''}{sentimentScore.toFixed(2)}</span></span>
                <span>News: {sentiment?.newsVolume || 0}</span>
              </div>
            </div>

            {/* Right: Technical Indicators */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Technical Indicators</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">RSI (14)</span>
                    <span className="font-mono">{parseFloat(latestRSI).toFixed(1)}</span>
                  </div>
                  <Progress value={parseFloat(latestRSI)} className="h-2" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">MACD</span>
                  <span className={cn("font-mono", parseFloat(latestMACD) >= 0 ? "text-success" : "text-destructive")}>
                    {parseFloat(latestMACD) >= 0 ? '+' : ''}{parseFloat(latestMACD).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Volume Trend</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    {(displayPredictions[0]?.technicalIndicators?.volumeTrend || 1) > 1 ? 'Above Average' : 'Below Average'}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Volatility</span>
                    <span className="font-mono">{volatility > 0.5 ? 'High' : volatility > 0.2 ? 'Medium' : 'Low'}</span>
                  </div>
                  <Progress value={Math.min(100, volatility * 100)} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Horizon Predictions Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Multi-Horizon Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayPredictions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Generating predictions...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Timeframe</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Predicted Price</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Change</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Change %</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Confidence</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Direction</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Sentiment Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPredictions.map((pred, index) => (
                    <tr
                      key={pred.id || index}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{pred.horizon}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono font-semibold text-lg">
                          ${pred.predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={cn("font-mono", pred.change > 0 ? "text-success" : "text-destructive")}>
                          {pred.change > 0 ? "+" : ""}${Math.abs(pred.change).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={cn("font-mono font-semibold", pred.changePercent > 0 ? "text-success" : "text-destructive")}>
                          {pred.changePercent > 0 ? "+" : ""}{pred.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <ConfidenceBadge confidence={pred.confidence} showLabel={false} />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {pred.direction === "up" ? (
                            <TrendingUp className="w-5 h-5 text-success" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={cn("font-mono", pred.sentimentImpact >= 0 ? "text-primary" : "text-destructive")}>
                          {pred.sentimentImpact >= 0 ? '+' : ''}{pred.sentimentImpact.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blockchain Verification Engine */}
      {mlAvailable && <BlockchainVerification />}

      {/* Prediction Visualization Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Prediction Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="hsl(var(--foreground))" strokeWidth={3} dot={{ fill: 'hsl(var(--foreground))', r: 6 }} name="Current Price" />
                <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: 'hsl(var(--primary))', r: 4 }} name="Predicted Price" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Historical Predictions Log */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Prediction History</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {autoUpdateEnabled && mlAvailable
                  ? `Predictions are automatically verified against actual prices and logged to blockchain every ${autoUpdateInterval} minutes`
                  : 'Verified predictions from your trading history'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Horizon</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Predicted</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Actual</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Error</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Direction</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Blockchain</th>
                </tr>
              </thead>
              <tbody>
                {verifiedPredictions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center">
                      {autoUpdateEnabled && mlAvailable ? (
                        <div className="space-y-2">
                          <p className="text-muted-foreground">
                            New predictions will appear here as they are created
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Next automated update in: {Math.floor(nextUpdateIn / 60)}:{String(nextUpdateIn % 60).padStart(2, '0')}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          Predictions will appear here once they're verified against actual prices
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  verifiedPredictions.map((pred) => {
                    const error = pred.actualPrice ? ((pred.actualPrice - pred.predictedPrice) / pred.predictedPrice * 100) : 0;
                    return (
                      <tr key={pred.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(pred.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{pred.horizon}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          ${pred.predictedPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          ${pred.actualPrice?.toFixed(2) || '—'}
                        </td>
                        <td className={cn(
                          "py-3 px-4 text-right font-mono",
                          Math.abs(error) < 1 ? "text-success" : Math.abs(error) < 2 ? "text-warning" : "text-destructive"
                        )}>
                          {error > 0 ? "+" : ""}{error.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          {pred.directionCorrect ? (
                            <Badge className="bg-success/20 text-success border-success/30">✓ Correct</Badge>
                          ) : (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/30">✗ Wrong</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1 inline-block"></span>
                            Logged
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
