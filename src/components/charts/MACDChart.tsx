import { useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { OHLCData, calculateMACD, MACDData } from "@/hooks/useCryptoData";

interface MACDChartProps {
  data: OHLCData[];
  className?: string;
}

export function MACDChart({ data, className }: MACDChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    const macd = calculateMACD(data, 12, 26, 9);
    
    return data.map((item, index) => {
      const time = new Date(item.timestamp);
      const formattedTime = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const macdData = macd[index];
      
      return {
        formattedTime,
        macd: macdData.macd,
        signal: macdData.signal,
        histogram: macdData.histogram,
        isPositive: macdData.histogram !== null && macdData.histogram >= 0,
      };
    });
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm text-muted-foreground mb-2">{data.formattedTime}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">MACD:</span>
              <span className="font-mono font-medium">
                {data.macd !== null ? data.macd.toFixed(4) : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">Signal:</span>
              <span className="font-mono font-medium">
                {data.signal !== null ? data.signal.toFixed(4) : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                data.isPositive ? "bg-success" : "bg-destructive"
              )} />
              <span className="text-muted-foreground">Histogram:</span>
              <span className={cn(
                "font-mono font-medium",
                data.isPositive ? "text-success" : "text-destructive"
              )}>
                {data.histogram !== null ? data.histogram.toFixed(4) : "N/A"}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          MACD
          <span className="text-xs text-muted-foreground/70">(12, 26, 9)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
              <XAxis
                dataKey="formattedTime"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Zero line */}
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
              
              {/* Histogram bars */}
              <Bar dataKey="histogram" maxBarSize={4}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    opacity={0.7}
                  />
                ))}
              </Bar>
              
              {/* MACD line */}
              <Line
                type="monotone"
                dataKey="macd"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                dot={false}
              />
              
              {/* Signal line */}
              <Line
                type="monotone"
                dataKey="signal"
                stroke="hsl(var(--warning))"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
