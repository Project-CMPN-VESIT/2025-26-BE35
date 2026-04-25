import { Line, LineChart, ResponsiveContainer } from "recharts";

interface MiniSparklineProps {
  data: number[];
  color?: "success" | "destructive" | "primary" | "muted";
  height?: number;
  className?: string;
}

export function MiniSparkline({ data, color = "primary", height = 40, className }: MiniSparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));
  
  const colorMap = {
    success: "hsl(var(--success))",
    destructive: "hsl(var(--destructive))",
    primary: "hsl(var(--primary))",
    muted: "hsl(var(--muted-foreground))",
  };

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={colorMap[color]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
