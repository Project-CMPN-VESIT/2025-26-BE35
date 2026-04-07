import { Clock, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export function RecentPredictionsCard() {
  const { predictions } = useStore();

  // Get the 5 most recent predictions
  const recentPredictions = predictions.slice(0, 5);

  return (
    <Card className="card-interactive">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          Recent Predictions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentPredictions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No predictions yet
            </p>
          ) : (
            recentPredictions.map((pred) => (
              <div 
                key={pred.id}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                    pred.direction === 'up' 
                      ? "bg-gradient-to-br from-success/20 to-success/5 group-hover:from-success/30 group-hover:to-success/10"
                      : "bg-gradient-to-br from-destructive/20 to-destructive/5 group-hover:from-destructive/30 group-hover:to-destructive/10"
                  )}>
                    {pred.direction === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold font-mono-numbers">
                        ${pred.predictedPrice.toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5 px-2 font-medium bg-muted/50">
                        {pred.horizon}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(pred.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence={pred.confidence} showLabel={false} size="sm" />
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
