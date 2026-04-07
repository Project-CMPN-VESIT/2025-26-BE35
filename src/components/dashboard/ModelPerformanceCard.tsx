import { useEffect, useState } from "react";
import { BarChart3, Brain, Cpu, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, Area, AreaChart, XAxis, YAxis } from "recharts";
import { useStore } from "@/store/useStore";
import mlPredictionService, { MLModelPerformance } from "@/services/mlPredictionService";
import { cn } from "@/lib/utils";

export function ModelPerformanceCard() {
  const { performanceMetrics, mlAvailable, mlModelInfo } = useStore();
  const [mlPerf, setMlPerf] = useState<MLModelPerformance | null>(null);

  // Fetch real ML performance metrics when the API is available
  useEffect(() => {
    if (mlAvailable) {
      mlPredictionService.getModelPerformance().then(setMlPerf);
    }
  }, [mlAvailable]);

  // ── Decide what to display ──────────────────────────────────────
  // Prefer real ML metrics; fall back to JS-calculated metrics
  const directionAccuracy = mlPerf?.directionAccuracy
    ?? performanceMetrics?.overall.directionAccuracy
    ?? 0;
  const mae = mlPerf?.mae ?? 0;
  const rmse = mlPerf?.rmse ?? 0;
  const upAcc = mlPerf?.upAccuracy ?? null;
  const downAcc = mlPerf?.downAccuracy ?? null;
  const modelVersion = mlPerf?.modelVersion ?? mlModelInfo?.modelVersion ?? null;
  const lastTrained = mlPerf?.modelLastTrained ?? null;
  const totalPreds = mlPerf?.totalPredictions ?? performanceMetrics?.overall.totalPredictions ?? 0;

  // Trend chart data
  const trendData = performanceMetrics?.byHorizon.map((h, i) => ({
    day: i + 1,
    accuracy: h.accuracy || 75
  })) || Array.from({ length: 15 }, (_, i) => ({
    day: i + 1,
    accuracy: 70 + Math.random() * 15
  }));

  const formattedLastTrained = lastTrained
    ? new Date(lastTrained).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card className="card-interactive">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          Model Performance
          {mlAvailable && (
            <Badge className="ml-auto bg-success/10 text-success border-success/20 text-[10px] gap-1 px-2">
              <Brain className="w-2.5 h-2.5" />
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Real ML Metrics when available */}
        {mlAvailable && mlPerf ? (
          <>
            {/* Primary metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <span className="text-xl font-bold font-mono text-primary">
                  ${mae.toFixed(0)}
                </span>
                <p className="text-[10px] text-muted-foreground uppercase mt-1 font-medium">MAE ($)</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <span className="text-xl font-bold font-mono">
                  ${rmse.toFixed(0)}
                </span>
                <p className="text-[10px] text-muted-foreground uppercase mt-1 font-medium">RMSE ($)</p>
              </div>
              <div className={cn(
                "text-center p-3 rounded-xl",
                directionAccuracy >= 55 ? "bg-success/10" : directionAccuracy >= 52 ? "bg-warning/10" : "bg-muted/20"
              )}>
                <span className={cn(
                  "text-xl font-bold font-mono",
                  directionAccuracy >= 55 ? "text-success" : directionAccuracy >= 52 ? "text-warning" : ""
                )}>
                  {directionAccuracy.toFixed(1)}%
                </span>
                <p className="text-[10px] text-muted-foreground uppercase mt-1 font-medium">Direction</p>
              </div>
            </div>

            {/* Direction accuracy bar */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/20">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Direction Accuracy</span>
                <span className={cn(
                  "font-mono font-semibold",
                  directionAccuracy >= 55 ? "text-success" : "text-muted-foreground"
                )}>
                  {directionAccuracy.toFixed(1)}%
                </span>
              </div>
              <Progress value={directionAccuracy} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-2.5 h-2.5 text-success" />
                  UP: {upAcc?.toFixed(1) ?? "—"}%
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-2.5 h-2.5 text-destructive" />
                  DOWN: {downAcc?.toFixed(1) ?? "—"}%
                </span>
              </div>
            </div>

            {/* Model info */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {modelVersion ?? "transformer"}
              </span>
              {formattedLastTrained && (
                <span>Trained: {formattedLastTrained}</span>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Fallback: JS-calculated metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <span className="text-xl font-bold font-mono text-primary">—</span>
                <p className="text-[10px] text-muted-foreground uppercase mt-1 font-medium">MAE ($)</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <span className="text-xl font-bold font-mono">—</span>
                <p className="text-[10px] text-muted-foreground uppercase mt-1 font-medium">RMSE ($)</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <span className="text-xl font-bold font-mono">
                  {directionAccuracy > 0 ? `${directionAccuracy.toFixed(1)}%` : "—"}
                </span>
                <p className="text-[10px] text-muted-foreground uppercase mt-1 font-medium">Direction</p>
              </div>
            </div>

            {/* Trend */}
            <div className="h-[70px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis domain={[60, 90]} hide />
                  <Area type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))"
                    strokeWidth={2} fill="url(#accuracyGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Start Flask API for real model metrics
            </p>
          </>
        )}

        <p className="text-[10px] text-muted-foreground text-center font-medium">
          {totalPreds > 0 ? `${totalPreds.toLocaleString()} predictions tracked` : "Performance trend"}
        </p>
      </CardContent>
    </Card>
  );
}
