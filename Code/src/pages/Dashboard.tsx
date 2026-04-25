import { useEffect } from "react";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { AdvancedPriceChart } from "@/components/charts/AdvancedPriceChart";
import { RecentPredictionsCard } from "@/components/dashboard/RecentPredictionsCard";
import { SentimentCard } from "@/components/dashboard/SentimentCard";
import { ModelPerformanceCard } from "@/components/dashboard/ModelPerformanceCard";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { useStore } from "@/store/useStore";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { initializeData } = useRealTimeData();
  const { isLoading, wsConnected, lastUpdated, error } = useStore();

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-fade-in max-w-[1800px] mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time cryptocurrency predictions and market analysis
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/60 border border-border/40 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wsConnected ? 'bg-success' : 'bg-warning'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected ? 'bg-success' : 'bg-warning'}`}></span>
          </span>
          <span className="text-sm text-muted-foreground">
            {wsConnected ? 'Live' : 'Connecting...'} • 
            {lastUpdated 
              ? ` Updated ${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}`
              : ' Auto-refresh 30s'
            }
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      )}

      {/* Metrics row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <DashboardMetrics />
      )}

      {/* Main chart with real-time data */}
      {isLoading ? (
        <Skeleton className="h-[500px] rounded-xl" />
      ) : (
        <AdvancedPriceChart />
      )}

      {/* Bottom row - 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))
        ) : (
          <>
            <RecentPredictionsCard />
            <SentimentCard />
            <ModelPerformanceCard />
          </>
        )}
      </div>
    </div>
  );
}
