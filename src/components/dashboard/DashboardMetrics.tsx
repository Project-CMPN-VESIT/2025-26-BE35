import { Bitcoin, TrendingUp, Wallet, Activity } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { StatusIndicator } from "@/components/shared/StatusIndicator";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/store/useStore";
import { SUPPORTED_SYMBOLS } from "@/services/binanceService";

export function DashboardMetrics() {
  const { 
    currentPrice, 
    priceStats, 
    predictions, 
    positions, 
    tradingStats,
    performanceMetrics,
    wsConnected,
    chartData,
    selectedSymbol
  } = useStore();

  // Generate sparkline from chart data
  const priceSparkline = chartData.slice(-10).map(d => d.close);
  const accuracySparkline = performanceMetrics?.byHorizon.map(h => h.accuracy) || [75, 78, 72, 80, 82, 79, 77, 81, 83, 78];

  // Get the latest prediction
  const latestPrediction = predictions[0] || null;
  
  // Get symbol name
  const symbolInfo = SUPPORTED_SYMBOLS.find(s => s.id === selectedSymbol);
  const symbolName = symbolInfo?.symbol || 'BTC';

  // Calculate total PnL from positions
  const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Current Price */}
      <MetricCard
        title={`Current ${symbolName} Price`}
        value=""
        icon={<Bitcoin className="w-5 h-5" />}
      >
        <div className="mt-2">
          <PriceDisplay 
            price={currentPrice || 0} 
            changePercent={priceStats?.changePercent24h || 0}
            change={priceStats?.change24h || 0}
            size="lg"
          />
          {priceSparkline.length > 0 && (
            <MiniSparkline 
              data={priceSparkline} 
              color={(priceStats?.changePercent24h || 0) >= 0 ? "success" : "destructive"}
              height={32}
              className="mt-3"
            />
          )}
        </div>
      </MetricCard>

      {/* Latest Prediction */}
      <MetricCard
        title="Latest Prediction"
        value=""
        icon={<TrendingUp className="w-5 h-5" />}
      >
        <div className="mt-2 space-y-3">
          {latestPrediction ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Next {latestPrediction.horizon}:</span>
                <Badge variant="outline" className={`${
                  latestPrediction.direction === 'up' 
                    ? 'bg-success/10 text-success border-success/30' 
                    : 'bg-destructive/10 text-destructive border-destructive/30'
                }`}>
                  {latestPrediction.direction === 'up' ? 'BULLISH' : 'BEARISH'}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono-numbers text-primary">
                  ${latestPrediction.predictedPrice.toLocaleString()}
                </span>
                <span className={latestPrediction.changePercent >= 0 ? "text-sm text-success" : "text-sm text-destructive"}>
                  {latestPrediction.changePercent >= 0 ? '+' : ''}{latestPrediction.changePercent.toFixed(2)}%
                </span>
              </div>
              <ConfidenceBadge confidence={latestPrediction.confidence} size="sm" />
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Loading predictions...</div>
          )}
        </div>
      </MetricCard>

      {/* Active Positions */}
      <MetricCard
        title="Active Positions"
        value=""
        icon={<Wallet className="w-5 h-5" />}
      >
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{positions.length}</span>
            <span className="text-sm text-muted-foreground">open trades</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">P&L: </span>
              <span className={`font-semibold font-mono-numbers ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Win: </span>
              <span className="font-semibold font-mono-numbers">{(tradingStats?.winRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </MetricCard>

      {/* System Health */}
      <MetricCard
        title="System Health"
        value=""
        icon={<Activity className="w-5 h-5" />}
      >
        <div className="mt-2 space-y-3">
          <StatusIndicator 
            status={wsConnected ? "active" : "idle"} 
            label={wsConnected ? "Live Data Feed" : "Connecting..."} 
            size="sm" 
          />
          <div className="text-sm text-muted-foreground">
            <span>Predictions: </span>
            <span className="text-foreground">{performanceMetrics?.overall.totalPredictions || 0} tracked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Accuracy:</span>
            <span className="font-semibold font-mono-numbers">
              {(performanceMetrics?.overall.accuracy || 0).toFixed(1)}%
            </span>
            {accuracySparkline.length > 0 && (
              <MiniSparkline 
                data={accuracySparkline} 
                color="success"
                height={20}
                className="flex-1"
              />
            )}
          </div>
        </div>
      </MetricCard>
    </div>
  );
}
