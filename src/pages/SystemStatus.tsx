import { Activity, Database, Cloud, Server, Play, Pause, RefreshCw, Download, Clock, Cpu, HardDrive, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusIndicator } from "@/components/shared/StatusIndicator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { systemStatus, apiStatus } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

export default function SystemStatus() {
  const { mlAvailable, mlModelInfo } = useStore();
  const cpuHistory = Array.from({ length: 60 }, (_, i) => ({
    time: i,
    value: 10 + Math.random() * 30,
  }));

  const memoryHistory = Array.from({ length: 60 }, (_, i) => ({
    time: i,
    value: 40 + Math.random() * 20,
  }));

  const scheduledTasks = [
    { name: "Data Collection", schedule: "Continuous", lastRun: "Just now", nextRun: "Continuous", status: "active" },
    { name: "Model Update", schedule: "Daily 2:00 AM", lastRun: "Jan 18, 2:00 AM", nextRun: "Jan 19, 2:00 AM", status: "scheduled" },
    { name: "Full Retrain", schedule: "Weekly Sun 3:00 AM", lastRun: "Jan 14, 3:00 AM", nextRun: "Jan 21, 3:00 AM", status: "scheduled" },
    { name: "Performance Check", schedule: "Daily 4:00 AM", lastRun: "Jan 18, 4:00 AM", nextRun: "Jan 19, 4:00 AM", status: "scheduled" },
    { name: "Blockchain Sync", schedule: "Hourly", lastRun: "5 min ago", nextRun: "55 min", status: "active" },
  ];

  const mockLogs = [
    { time: "12:45:32", level: "info", message: "Data fetched successfully from Kraken API", source: "data_collector" },
    { time: "12:45:30", level: "info", message: "Prediction generated for 1H horizon: $52,680", source: "model" },
    { time: "12:45:28", level: "warning", message: "IPFS gateway response time elevated: 890ms", source: "blockchain" },
    { time: "12:45:25", level: "info", message: "Sentiment analysis completed: 0.65 (BULLISH)", source: "sentiment" },
    { time: "12:45:20", level: "info", message: "Security scan completed: 0 critical, 5 high risk", source: "security" },
    { time: "12:45:15", level: "error", message: "Failed to connect to backup RPC endpoint", source: "blockchain" },
    { time: "12:45:10", level: "info", message: "Model accuracy check: 78.3% (within threshold)", source: "performance" },
    { time: "12:45:05", level: "info", message: "WebSocket connection renewed", source: "data_collector" },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error": return "text-destructive";
      case "warning": return "text-warning";
      default: return "text-muted-foreground";
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case "error": return "bg-destructive/10";
      case "warning": return "bg-warning/10";
      default: return "bg-muted/30";
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">System Status</h1>
        <p className="text-muted-foreground text-sm">
          Monitor system health, processes, and scheduled tasks
        </p>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-success" />
              </div>
              <div>
                <StatusIndicator status="active" label="Data Collection" />
                <div className="text-xs text-muted-foreground mt-1">
                  Last fetch: Just now
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: 12.4M data points
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">Uptime:</span>
                  <span className="text-xs font-semibold text-success">99.9%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                mlAvailable ? "bg-primary/10" : "bg-muted/30"
              )}>
                <Brain className={cn("w-6 h-6", mlAvailable ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div>
                <StatusIndicator
                  status={mlAvailable ? "operational" : "inactive" as any}
                  label="ML Model (Flask API)"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {mlAvailable
                    ? `Version: ${mlModelInfo?.modelVersion ?? "transformer"}`
                    : "Start start_api.bat to connect"}
                </div>
                {mlAvailable && mlModelInfo?.directionAccuracy !== null && (
                  <div className="text-xs text-muted-foreground">
                    Direction Accuracy: {mlModelInfo?.directionAccuracy?.toFixed(1)}%
                  </div>
                )}
                {mlAvailable && mlModelInfo?.dataAgeHours !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">Data age:</span>
                    <span className={cn(
                      "text-xs font-medium",
                      (mlModelInfo?.dataAgeHours ?? 0) < 24 ? "text-success" : "text-warning"
                    )}>
                      {mlModelInfo?.dataAgeHours?.toFixed(0)}h ago
                    </span>
                  </div>
                )}
                {mlAvailable && mlModelInfo?.device && (
                  <div className="text-xs text-muted-foreground">
                    Device: {mlModelInfo.device}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Status</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(apiStatus).map(([name, data]) => (
                  <div key={name} className="flex items-center gap-2">
                    <StatusIndicator
                      status={data.status as any}
                      size="sm"
                      showPulse={data.status === "operational"}
                    />
                    <span className="text-xs capitalize">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-chart-volume/10 flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-chart-volume" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">Storage Status</span>
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <div className="flex justify-between">
                    <span>Database:</span>
                    <span>4.2 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IPFS:</span>
                    <span>2.4 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logs:</span>
                    <span>856 MB</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-xs mt-2 px-0 text-destructive">
                  Cleanup Old Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Processes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Active Processes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Process</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">CPU</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Memory</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Uptime</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(systemStatus).map(([name, data]) => (
                    <tr key={name} className="border-b border-border/50">
                      <td className="py-3 px-3 text-sm capitalize">
                        {name.replace(/([A-Z])/g, ' $1').trim()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusIndicator
                          status={data.status as any}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={cn(
                          "font-mono text-sm",
                          data.cpu > 50 ? "text-warning" : data.cpu > 80 ? "text-destructive" : ""
                        )}>
                          {data.cpu}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm">{data.memory} MB</td>
                      <td className="py-3 px-3 text-right text-sm text-muted-foreground">{data.uptime}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {data.status === "active" ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* System Logs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                System Logs
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="text-xs">All Logs</TabsTrigger>
                <TabsTrigger value="errors" className="text-xs">Errors</TabsTrigger>
                <TabsTrigger value="warnings" className="text-xs">Warnings</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-2 max-h-[300px] overflow-y-auto">
                {mockLogs.map((log, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded text-xs font-mono",
                      getLevelBg(log.level)
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-muted-foreground">{log.time}</span>
                      <Badge variant="outline" className={cn("text-[10px] h-4", getLevelColor(log.level))}>
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground">[{log.source}]</span>
                    </div>
                    <div className={getLevelColor(log.level)}>{log.message}</div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="errors" className="space-y-2 max-h-[300px] overflow-y-auto">
                {mockLogs.filter(l => l.level === "error").map((log, index) => (
                  <div key={index} className={cn("p-2 rounded text-xs font-mono", getLevelBg(log.level))}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-muted-foreground">{log.time}</span>
                      <Badge variant="outline" className="text-[10px] h-4 text-destructive">ERROR</Badge>
                    </div>
                    <div className="text-destructive">{log.message}</div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="warnings" className="space-y-2 max-h-[300px] overflow-y-auto">
                {mockLogs.filter(l => l.level === "warning").map((log, index) => (
                  <div key={index} className={cn("p-2 rounded text-xs font-mono", getLevelBg(log.level))}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-muted-foreground">{log.time}</span>
                      <Badge variant="outline" className="text-[10px] h-4 text-warning">WARNING</Badge>
                    </div>
                    <div className="text-warning">{log.message}</div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Tasks */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Scheduled Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Task Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Schedule</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Last Run</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Next Run</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledTasks.map((task, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{task.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{task.schedule}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{task.lastRun}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className="text-primary">{task.nextRun}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={cn(
                        task.status === "active"
                          ? "bg-success/20 text-success border-success/30"
                          : "bg-muted text-muted-foreground border-muted-foreground/30"
                      )}>
                        {task.status === "active" ? "Running" : "Scheduled"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        {task.status === "active" ? "Pause" : "Run Now"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">CPU Usage (Last Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'CPU']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Memory Usage (Last Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memoryHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Memory']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--chart-volume))"
                    fill="hsl(var(--chart-volume))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
