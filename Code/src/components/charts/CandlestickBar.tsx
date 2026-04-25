import { Rectangle } from "recharts";

interface CandlestickBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  open?: number;
  close?: number;
  low?: number;
  high?: number;
  openValue?: number;
  closeValue?: number;
  lowValue?: number;
  highValue?: number;
}

// Custom candlestick shape for Recharts
export function CandlestickBar(props: CandlestickBarProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    open = 0,
    close = 0,
    low = 0,
    high = 0,
    openValue = 0,
    closeValue = 0,
    lowValue = 0,
    highValue = 0,
  } = props;

  const isGreen = closeValue >= openValue;
  const color = isGreen ? "hsl(var(--success))" : "hsl(var(--destructive))";
  
  // Calculate positions based on price values
  const candleWidth = Math.max(width * 0.6, 4);
  const candleX = x + (width - candleWidth) / 2;
  
  // Body of the candle
  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.abs(open - close) || 1;
  
  // Wick (high-low line)
  const wickX = x + width / 2;

  return (
    <g>
      {/* Wick (shadow) */}
      <line
        x1={wickX}
        y1={high}
        x2={wickX}
        y2={low}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <Rectangle
        x={candleX}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={isGreen ? color : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
}
