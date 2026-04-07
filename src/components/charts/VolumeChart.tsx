import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OHLCData } from "@/hooks/useCryptoData";

interface VolumeChartProps {
  data: OHLCData[];
  className?: string;
}

export function VolumeChart({ data, className }: VolumeChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    return data.map((item) => {
      const time = new Date(item.timestamp);
      const formattedTime = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      
      return {
        formattedTime,
        volume: item.volume,
        isGreen: item.close >= item.open,
      };
    });
  }, [data]);

  const totalVolume = useMemo(() => {
    return data.reduce((sum, d) => sum + d.volume, 0);
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm text-muted-foreground mb-1">{data.formattedTime}</p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Volume:</span>
            <span className="font-mono font-medium">
              ${(data.volume / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Volume
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Total: ${(totalVolume / 1000000000).toFixed(2)}B
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
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
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Bar dataKey="volume" maxBarSize={8} radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isGreen ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    opacity={0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
