import { useState } from "react";
import { AdvancedPriceChart } from "./AdvancedPriceChart";
import { RSIChart } from "./RSIChart";
import { MACDChart } from "./MACDChart";
import { VolumeChart } from "./VolumeChart";
import { useCryptoData, CoinId, TimeRange } from "@/hooks/useCryptoData";
import { IndicatorType } from "./ChartControls";

interface ChartSectionProps {
  className?: string;
}

export function ChartSection({ className }: ChartSectionProps) {
  const [selectedCoin, setSelectedCoin] = useState<CoinId>("bitcoin");
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>("1h");
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(["volume"]);

  const { ohlcData } = useCryptoData(selectedCoin, selectedTimeRange);

  const showRSI = activeIndicators.includes("rsi");
  const showMACD = activeIndicators.includes("macd");

  return (
    <div className={className}>
      {/* Main Price Chart with controls */}
      <AdvancedPriceChart />

      {/* Additional indicator charts - shown when toggled */}
      {(showRSI || showMACD) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {showRSI && <RSIChart data={ohlcData} />}
          {showMACD && <MACDChart data={ohlcData} />}
        </div>
      )}
    </div>
  );
}
