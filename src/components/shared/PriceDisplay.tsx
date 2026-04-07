import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  change?: number;
  changePercent?: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showChange?: boolean;
  className?: string;
}

export function PriceDisplay({
  price,
  change,
  changePercent,
  currency = "$",
  size = "md",
  showChange = true,
  className,
}: PriceDisplayProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const isPositive = (changePercent ?? 0) > 0;
  const isNegative = (changePercent ?? 0) < 0;

  const sizeClasses = {
    sm: { price: "text-lg", change: "text-xs" },
    md: { price: "text-2xl", change: "text-sm" },
    lg: { price: "text-3xl", change: "text-base" },
    xl: { price: "text-4xl", change: "text-lg" },
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("font-bold font-mono-numbers", sizeClasses[size].price)}>
        {currency}{formatPrice(price)}
      </span>
      
      {showChange && changePercent !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 font-medium font-mono-numbers",
            sizeClasses[size].change,
            isPositive && "text-success",
            isNegative && "text-destructive",
            !isPositive && !isNegative && "text-muted-foreground"
          )}
        >
          {isPositive && <TrendingUp className="w-3 h-3" />}
          {isNegative && <TrendingDown className="w-3 h-3" />}
          {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
          
          {change !== undefined && (
            <span>
              {isPositive ? "+" : ""}
              {currency}{formatPrice(Math.abs(change))}
            </span>
          )}
          
          <span>
            ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  );
}
