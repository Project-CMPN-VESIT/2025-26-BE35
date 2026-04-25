import { cn } from "@/lib/utils";

interface SentimentGaugeProps {
  score: number; // -1 to 1
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function SentimentGauge({ score, size = "md", showLabel = true, className }: SentimentGaugeProps) {
  // Normalize score from -1...1 to 0...180 degrees
  const rotation = ((score + 1) / 2) * 180;
  
  const getSentimentLabel = () => {
    if (score > 0.3) return "BULLISH";
    if (score < -0.3) return "BEARISH";
    return "NEUTRAL";
  };

  const getSentimentColor = () => {
    if (score > 0.3) return "text-success";
    if (score < -0.3) return "text-destructive";
    return "text-warning";
  };

  const getSentimentBg = () => {
    if (score > 0.3) return "bg-success/10";
    if (score < -0.3) return "bg-destructive/10";
    return "bg-warning/10";
  };

  const sizeClasses = {
    sm: { container: "w-28 h-14", text: "text-lg", label: "text-[10px]", needle: 2 },
    md: { container: "w-36 h-18", text: "text-2xl", label: "text-xs", needle: 2.5 },
    lg: { container: "w-52 h-26", text: "text-4xl", label: "text-sm", needle: 3 },
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className={cn("relative", sizeClasses[size].container)}>
        {/* Background arc */}
        <svg viewBox="0 0 100 55" className="w-full h-full drop-shadow-lg">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--destructive))" />
              <stop offset="50%" stopColor="hsl(var(--warning))" />
              <stop offset="100%" stopColor="hsl(var(--success))" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background track */}
          <path
            d="M 8 48 A 42 42 0 0 1 92 48"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Filled arc with glow */}
          <path
            d="M 8 48 A 42 42 0 0 1 92 48"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#glow)"
          />
          
          {/* Tick marks */}
          {[0, 45, 90, 135, 180].map((angle, i) => {
            const rad = (angle - 180) * (Math.PI / 180);
            const x1 = 50 + 35 * Math.cos(rad);
            const y1 = 48 + 35 * Math.sin(rad);
            const x2 = 50 + 40 * Math.cos(rad);
            const y2 = 48 + 40 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
                opacity="0.5"
              />
            );
          })}
          
          {/* Needle with enhanced styling */}
          <g transform={`rotate(${rotation - 90}, 50, 48)`}>
            <line
              x1="50"
              y1="48"
              x2="50"
              y2="14"
              stroke="hsl(var(--foreground))"
              strokeWidth={sizeClasses[size].needle}
              strokeLinecap="round"
              filter="url(#glow)"
            />
            <circle cx="50" cy="48" r="5" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <circle cx="50" cy="48" r="2" fill="hsl(var(--primary))" />
          </g>
        </svg>
        
        {/* Score display */}
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className={cn("font-bold font-mono-numbers", sizeClasses[size].text, getSentimentColor())}>
            {score > 0 ? "+" : ""}{score.toFixed(2)}
          </span>
        </div>
      </div>
      
      {showLabel && (
        <span className={cn(
          "font-bold tracking-widest px-3 py-1 rounded-full",
          sizeClasses[size].label, 
          getSentimentColor(),
          getSentimentBg()
        )}>
          {getSentimentLabel()}
        </span>
      )}
      
      {/* Scale labels */}
      <div className="flex justify-between w-full px-1 text-[10px] text-muted-foreground font-medium">
        <span>-1.0</span>
        <span>0</span>
        <span>+1.0</span>
      </div>
    </div>
  );
}
