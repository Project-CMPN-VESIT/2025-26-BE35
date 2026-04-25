import { useState } from "react";
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
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  data: CandleData[];
  predictions?: { time: string; price: number; confidence: number }[];
  className?: string;
}

const timeframes = ["1H", "4H", "12H", "1D", "1W"];
const intervals = ["1min", "5min", "15min", "1hr"];

export function PriceChart({ data, predictions, className }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [selectedInterval, setSelectedInterval] = useState("15min");
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);

  // Calculate moving averages
  const chartData = data.map((item, index) => {
    const ma20 = index >= 19 
      ? data.slice(index - 19, index + 1).reduce((sum, d) => sum + d.close, 0) / 20 
      : null;
    const ma50 = index >= 49 
      ? data.slice(index - 49, index + 1).reduce((sum, d) => sum + d.close, 0) / 50 
      : null;
    
    const time = new Date(item.time);
    const formattedTime = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    return {
      ...item,
      formattedTime,
      ma20,
      ma50,
      color: item.close >= item.open ? "hsl(var(--success))" : "hsl(var(--destructive))",
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{data.formattedTime}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Open:</span>
            <span className="font-mono">${data.open.toFixed(2)}</span>
            <span className="text-muted-foreground">High:</span>
            <span className="font-mono text-success">${data.high.toFixed(2)}</span>
            <span className="text-muted-foreground">Low:</span>
            <span className="font-mono text-destructive">${data.low.toFixed(2)}</span>
            <span className="text-muted-foreground">Close:</span>
            <span className="font-mono">${data.close.toFixed(2)}</span>
            <span className="text-muted-foreground">Volume:</span>
            <span className="font-mono">{data.volume.toFixed(0)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-semibold">BTC/USD Price Chart</CardTitle>
            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success pulse-live" />
              Live
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe selector */}
            <div className="flex rounded-xl bg-muted/30 p-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-lg h-8 px-3.5 text-xs font-medium transition-all",
                    selectedTimeframe === tf 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  )}
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf}
                </Button>
              ))}
            </div>

            {/* Interval selector */}
            <div className="flex rounded-xl bg-muted/30 p-1">
              {intervals.map((interval) => (
                <Button
                  key={interval}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-lg h-8 px-2.5 text-xs font-medium transition-all",
                    selectedInterval === interval 
                      ? "bg-card text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  )}
                  onClick={() => setSelectedInterval(interval)}
                >
                  {interval}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay toggles */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Toggle 
            size="sm" 
            pressed={showMA20} 
            onPressedChange={setShowMA20}
            className="h-8 px-3 text-xs rounded-lg border-0 data-[state=on]:bg-chart-volume/15 data-[state=on]:text-chart-volume font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-chart-volume mr-2" />
            MA(20)
          </Toggle>
          <Toggle 
            size="sm" 
            pressed={showMA50} 
            onPressedChange={setShowMA50}
            className="h-8 px-3 text-xs rounded-lg border-0 data-[state=on]:bg-warning/15 data-[state=on]:text-warning font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-warning mr-2" />
            MA(50)
          </Toggle>
          <Toggle 
            size="sm" 
            pressed={showPredictions} 
            onPressedChange={setShowPredictions}
            className="h-8 px-3 text-xs rounded-lg border-0 data-[state=on]:bg-primary/15 data-[state=on]:text-primary font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-primary mr-2" />
            AI Predictions
          </Toggle>
        </div>
      </CardHeader>

      <CardContent>
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
              />
              <YAxis 
                yAxisId="price"
                domain={["auto", "auto"]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <YAxis 
                yAxisId="volume"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                hide
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Volume bars */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="hsl(var(--chart-volume))"
                opacity={0.3}
                maxBarSize={8}
              />

              {/* Price line (simplified candlestick) */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                dot={false}
              />

              {/* MA20 */}
              {showMA20 && (
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

              {/* MA50 */}
              {showMA50 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma50"
                  stroke="hsl(var(--warning))"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                />
              )}

              {/* Prediction line */}
              {showPredictions && (
                <ReferenceLine 
                  yAxisId="price" 
                  y={52680} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ 
                    value: "1H Prediction: $52,680", 
                    position: "right",
                    fill: "hsl(var(--primary))",
                    fontSize: 11
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
