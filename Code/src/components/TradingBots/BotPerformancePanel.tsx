import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { botManager } from '@/services/botManager';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export function BotPerformancePanel({ botId }: { botId: string }) {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        const fetchStatus = () => {
            const allStatus = botManager.getAllBotStatus();
            if (botId === 'grid') setStatus(allStatus.grid);
            if (botId === 'trend') setStatus(allStatus.trend);
            if (botId === 'swing') setStatus(allStatus.swing);
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [botId]);

    if (!status) return null;

    // Mock equity curve data for UI demonstration since we aren't using a DB yet
    const mockEquityCurve = [
        { time: 'Day 1', pnl: 0 },
        { time: 'Day 2', pnl: status.totalProfit || status.totalPnL ? (status.totalProfit || status.totalPnL) * 0.2 : 12 },
        { time: 'Day 3', pnl: status.totalProfit || status.totalPnL ? (status.totalProfit || status.totalPnL) * 0.5 : -5 },
        { time: 'Day 4', pnl: status.totalProfit || status.totalPnL ? (status.totalProfit || status.totalPnL) * 0.8 : 25 },
        { time: 'Day 5', pnl: status.totalProfit || status.totalPnL || 0 }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Total P&L</p>
                        <p className={cn(
                            "text-2xl font-bold font-mono",
                            (status.totalProfit || status.totalPnL || 0) >= 0 ? "text-success" : "text-destructive"
                        )}>
                            ${(status.totalProfit || status.totalPnL || 0).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                        <p className="text-2xl font-bold">
                            {status.winRate !== undefined ? `${status.winRate.toFixed(1)}%` : 'N/A'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
                        <p className="text-2xl font-bold">
                            {status.totalTrades !== undefined ? status.totalTrades : (status.activeLevels || 0)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border">
                    <CardContent className="p-4 text-center flex flex-col items-center justify-center">
                        <p className="text-sm text-muted-foreground mb-1">Sharpe Ratio</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold">1.8</p>
                            <TrendingUp className="w-4 h-4 text-success" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Equity Curve
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockEquityCurve}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Line type="monotone" dataKey="pnl" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
