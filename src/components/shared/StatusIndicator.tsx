import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "active" | "idle" | "warning" | "error" | "operational" | "degraded";
  label?: string;
  showPulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusIndicator({ status, label, showPulse = true, size = "md", className }: StatusIndicatorProps) {
  const statusConfig = {
    active: { color: "bg-success", textColor: "text-success", displayLabel: "Active" },
    operational: { color: "bg-success", textColor: "text-success", displayLabel: "Operational" },
    idle: { color: "bg-muted-foreground", textColor: "text-muted-foreground", displayLabel: "Idle" },
    warning: { color: "bg-warning", textColor: "text-warning", displayLabel: "Warning" },
    degraded: { color: "bg-warning", textColor: "text-warning", displayLabel: "Degraded" },
    error: { color: "bg-destructive", textColor: "text-destructive", displayLabel: "Error" },
  };

  const config = statusConfig[status];

  const sizeClasses = {
    sm: { dot: "w-1.5 h-1.5", text: "text-xs" },
    md: { dot: "w-2 h-2", text: "text-sm" },
    lg: { dot: "w-2.5 h-2.5", text: "text-base" },
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center justify-center">
        <span className={cn("rounded-full", config.color, sizeClasses[size].dot)} />
        {showPulse && (status === "active" || status === "operational") && (
          <span 
            className={cn(
              "absolute rounded-full animate-ping opacity-75",
              config.color,
              sizeClasses[size].dot
            )} 
          />
        )}
      </div>
      {(label || config.displayLabel) && (
        <span className={cn("font-medium", config.textColor, sizeClasses[size].text)}>
          {label || config.displayLabel}
        </span>
      )}
    </div>
  );
}
