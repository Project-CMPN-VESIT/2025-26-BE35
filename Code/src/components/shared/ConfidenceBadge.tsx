import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceBadge({ confidence, showLabel = true, size = "md", className }: ConfidenceBadgeProps) {
  const getConfidenceLevel = () => {
    if (confidence >= 75) return { level: "high", color: "confidence-high", emoji: "🟢", glow: "shadow-success/20" };
    if (confidence >= 60) return { level: "medium", color: "confidence-medium", emoji: "🟡", glow: "shadow-warning/20" };
    return { level: "low", color: "confidence-low", emoji: "🔴", glow: "shadow-destructive/20" };
  };

  const { level, color, emoji, glow } = getConfidenceLevel();

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-mono-numbers font-semibold border transition-all",
        color,
        sizeClasses[size],
        `shadow-sm ${glow}`,
        className
      )}
    >
      <span className="mr-1.5">{emoji}</span>
      {confidence}%
      {showLabel && <span className="ml-1.5 font-normal opacity-70">({level})</span>}
    </Badge>
  );
}
