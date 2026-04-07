import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { COINS, CoinId, TimeRange } from "@/hooks/useCryptoData";
import { TrendingUp, BarChart3, Activity, Layers } from "lucide-react";

export type ChartType = "line" | "candlestick";
export type IndicatorType = "ma" | "ema" | "rsi" | "macd" | "volume";

interface ChartControlsProps {
  selectedCoin: CoinId;
  onCoinChange: (coin: CoinId) => void;
  selectedTimeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  activeIndicators: IndicatorType[];
  onIndicatorToggle: (indicator: IndicatorType) => void;
}

const TIME_RANGES: TimeRange[] = ["1m", "5m", "15m", "1h", "4h", "1D", "1W", "1M"];

const INDICATORS: { id: IndicatorType; label: string; icon: React.ReactNode }[] = [
  { id: "ma", label: "MA(20)", icon: <TrendingUp className="w-3 h-3" /> },
  { id: "ema", label: "EMA(12)", icon: <Activity className="w-3 h-3" /> },
  { id: "rsi", label: "RSI", icon: <BarChart3 className="w-3 h-3" /> },
  { id: "macd", label: "MACD", icon: <Layers className="w-3 h-3" /> },
  { id: "volume", label: "Volume", icon: <BarChart3 className="w-3 h-3" /> },
];

export function ChartControls({
  selectedCoin,
  onCoinChange,
  selectedTimeRange,
  onTimeRangeChange,
  chartType,
  onChartTypeChange,
  activeIndicators,
  onIndicatorToggle,
}: ChartControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Top row: Coin selector, Chart type, Time range */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Coin Selector */}
        <Select value={selectedCoin} onValueChange={(v) => onCoinChange(v as CoinId)}>
          <SelectTrigger className="w-[140px] h-9 bg-muted/30 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {COINS.map((coin) => (
              <SelectItem key={coin.id} value={coin.id}>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{coin.symbol}</span>
                  <span className="text-muted-foreground text-xs">{coin.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Chart Type Toggle */}
        <div className="flex rounded-xl bg-muted/30 p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-lg h-8 px-3 text-xs font-medium transition-all",
              chartType === "line"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
            onClick={() => onChartTypeChange("line")}
          >
            Line
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-lg h-8 px-3 text-xs font-medium transition-all",
              chartType === "candlestick"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            )}
            onClick={() => onChartTypeChange("candlestick")}
          >
            Candles
          </Button>
        </div>

        {/* Time Range Selector */}
        <div className="flex rounded-xl bg-muted/30 p-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-lg h-8 px-2.5 text-xs font-medium transition-all",
                selectedTimeRange === range
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
              onClick={() => onTimeRangeChange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Bottom row: Indicators */}
      <div className="flex flex-wrap gap-2">
        {INDICATORS.map((indicator) => (
          <Toggle
            key={indicator.id}
            size="sm"
            pressed={activeIndicators.includes(indicator.id)}
            onPressedChange={() => onIndicatorToggle(indicator.id)}
            className={cn(
              "h-8 px-3 text-xs rounded-lg border-0 font-medium gap-1.5",
              activeIndicators.includes(indicator.id)
                ? "bg-primary/15 text-primary"
                : "bg-muted/20 text-muted-foreground hover:text-foreground"
            )}
          >
            {indicator.icon}
            {indicator.label}
          </Toggle>
        ))}
      </div>
    </div>
  );
}
