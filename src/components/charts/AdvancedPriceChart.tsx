import { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  useCryptoData, 
  CoinId, 
  TimeRange,
  calculateMA,
  calculateEMA,
  OHLCData,
} from "@/hooks/useCryptoData";
import { ChartControls, ChartType, IndicatorType } from "./ChartControls";
import { COINS } from "@/hooks/useCryptoData";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdvancedPriceChartProps {
  className?: string;
}

export function AdvancedPriceChart({ className }: AdvancedPriceChartProps) {
  const [selectedCoin, setSelectedCoin] = useState<CoinId>("bitcoin");
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("1h");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(["volume"]);

  const { currentPrice, ohlcData, isLoading, error, refetch } = useCryptoData(
    selectedCoin,
    selectedTimeRange
  );

  const coinInfo = COINS.find((c) => c.id === selectedCoin);

  const handleIndicatorToggle = (indicator: IndicatorType) => {
    setActiveIndicators((prev) =>
      prev.includes(indicator)
        ? prev.filter((i) => i !== indicator)
        : [...prev, indicator]
    );
  };

  // Calculate chart data with indicators
  const chartData = useMemo(() => {
    if (ohlcData.length === 0) return [];

    const ma20 = calculateMA(ohlcData, 20);
    const ema12 = calculateEMA(ohlcData, 12);

    return ohlcData.map((item, index) => {
      const time = new Date(item.timestamp);
      let formattedTime: string;
      
      if (selectedTimeRange === "1D" || selectedTimeRange === "1W" || selectedTimeRange === "1M") {
        formattedTime = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        formattedTime = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      }

      return {
        ...item,
        formattedTime,
        ma20: ma20[index],
        ema12: ema12[index],
        isGreen: item.close >= item.open,
      };
    });
  }, [ohlcData, selectedTimeRange]);

  // Calculate domain with padding
  const priceDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const prices = chartData.flatMap((d) => [d.high, d.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as OHLCData & { formattedTime: string; isGreen: boolean };
      const isGreen = data.close >= data.open;
      
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm text-muted-foreground mb-2 font-medium">{data.formattedTime}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Open:</span>
            <span className="font-mono font-medium">${data.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-muted-foreground">High:</span>
            <span className="font-mono font-medium text-success">${data.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono font-medium text-destructive">${data.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-muted-foreground">Close:</span>
            <span className={cn("font-mono font-medium", isGreen ? "text-success" : "text-destructive")}>
              ${data.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {activeIndicators.includes("volume") && (
              <>
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-mono">${(data.volume / 1000000).toFixed(2)}M</span>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const formatPrice = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    if (value >= 1) {
      return `$${value.toFixed(2)}`;
    }
    return `$${value.toFixed(4)}`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          {/* Title and price info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  {coinInfo?.symbol}/USD
                  <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success pulse-live" />
                    Live
                  </span>
                </CardTitle>
                {currentPrice && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-bold font-mono">
                      ${currentPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full",
                        currentPrice.change24h >= 0
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {currentPrice.change24h >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {currentPrice.change24h >= 0 ? "+" : ""}
                      {currentPrice.change24h.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={isLoading}
              className="h-8 px-3 gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Chart Controls */}
          <ChartControls
            selectedCoin={selectedCoin}
            onCoinChange={setSelectedCoin}
            selectedTimeRange={selectedTimeRange}
            onTimeRangeChange={setSelectedTimeRange}
            chartType={chartType}
            onChartTypeChange={setChartType}
            activeIndicators={activeIndicators}
            onIndicatorToggle={handleIndicatorToggle}
          />
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          </div>
        ) : error && chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Failed to load data</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="formattedTime"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="price"
                  domain={priceDomain}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatPrice}
                  width={60}
                />
                {activeIndicators.includes("volume") && (
                  <YAxis
                    yAxisId="volume"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    hide
                  />
                )}
                <Tooltip content={<CustomTooltip />} />

                {/* Volume bars */}
                {activeIndicators.includes("volume") && (
                  <Bar yAxisId="volume" dataKey="volume" maxBarSize={8} opacity={0.4}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isGreen ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                      />
                    ))}
                  </Bar>
                )}

                {/* Candlestick representation using lines */}
                {chartType === "candlestick" ? (
                  <>
                    {/* High-Low wicks */}
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="high"
                      stroke="transparent"
                      dot={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="low"
                      stroke="transparent"
                      dot={false}
                    />
                    {/* Open-Close as bars */}
                    <Bar yAxisId="price" dataKey="close" maxBarSize={6}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`candle-${index}`}
                          fill={entry.isGreen ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                        />
                      ))}
                    </Bar>
                  </>
                ) : (
                  /* Line chart */
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                )}

                {/* MA(20) */}
                {activeIndicators.includes("ma") && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma20"
                    stroke="hsl(var(--chart-volume))"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                )}

                {/* EMA(12) */}
                {activeIndicators.includes("ema") && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ema12"
                    stroke="hsl(var(--warning))"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                )}

                {/* Current price reference line */}
                {currentPrice && (
                  <ReferenceLine
                    yAxisId="price"
                    y={currentPrice.price}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Price stats bar */}
        {currentPrice && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/50 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">24h High:</span>
              <span className="font-mono text-success">
                ${currentPrice.high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">24h Low:</span>
              <span className="font-mono text-destructive">
                ${currentPrice.low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">24h Volume:</span>
              <span className="font-mono">
                ${(currentPrice.volume24h / 1000000000).toFixed(2)}B
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Market Cap:</span>
              <span className="font-mono">
                ${(currentPrice.marketCap / 1000000000).toFixed(2)}B
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
