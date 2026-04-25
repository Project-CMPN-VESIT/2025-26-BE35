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
import { OHLCData, calculateRSI } from "@/hooks/useCryptoData";

interface RSIChartProps {
  data: OHLCData[];
  className?: string;
}

export function RSIChart({ data, className }: RSIChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    const rsi = calculateRSI(data, 14);
    
    return data.map((item, index) => {
      const time = new Date(item.timestamp);
      const formattedTime = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      
      return {
        formattedTime,
        rsi: rsi[index],
      };
    });
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const rsiValue = data.rsi;
      
      let status = "Neutral";
      let statusColor = "text-muted-foreground";
      if (rsiValue !== null) {
        if (rsiValue >= 70) {
          status = "Overbought";
          statusColor = "text-destructive";
        } else if (rsiValue <= 30) {
          status = "Oversold";
          statusColor = "text-success";
        }
      }
      
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm text-muted-foreground mb-1">{data.formattedTime}</p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">RSI(14):</span>
            <span className="font-mono font-medium">
              {rsiValue !== null ? rsiValue.toFixed(2) : "N/A"}
            </span>
            <span className={cn("text-xs", statusColor)}>({status})</span>
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
          RSI (14)
          <span className="text-xs text-muted-foreground/70">Relative Strength Index</span>
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
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 30, 50, 70, 100]}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Overbought zone */}
              <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
              {/* Oversold zone */}
              <ReferenceLine y={30} stroke="hsl(var(--success))" strokeDasharray="3 3" strokeOpacity={0.5} />
              {/* Middle line */}
              <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.3} />
              
              <Line
                type="monotone"
                dataKey="rsi"
                stroke="hsl(var(--primary))"
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
