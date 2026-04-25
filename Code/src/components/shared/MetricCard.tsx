import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
  children?: ReactNode;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  trend,
  className,
  children,
}: MetricCardProps) {
  return (
    <Card className={cn("card-interactive group", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2.5">
              <p className="text-2xl font-bold font-mono-numbers tracking-tight">{value}</p>
              {change !== undefined && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full",
                    change > 0 
                      ? "text-success bg-success/10" 
                      : change < 0 
                        ? "text-destructive bg-destructive/10" 
                        : "text-muted-foreground bg-muted/50"
                  )}
                >
                  {change > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : change < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : null}
                  {change > 0 ? "+" : ""}{change}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {changeLabel && (
              <p className="text-xs text-muted-foreground">{changeLabel}</p>
            )}
          </div>
          {icon && (
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
              {icon}
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
