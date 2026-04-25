import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { botManager } from '@/services/botManager';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BotLivePanel({ botId }: { botId: string }) {
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Live Execution Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {botId === 'grid' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-muted/30 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground mb-1">Active Levels</p>
                                    <p className="text-2xl font-bold">{status.activeLevels}</p>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground mb-1">Grid Levels Built</p>
                                    <p className="text-2xl font-bold">{status.gridLevels}</p>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground mb-1">Total Limit Orders</p>
                                    <p className="text-2xl font-bold">{status.gridLevels * 2}</p>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                                    <Badge variant={status.isActive ? "default" : "secondary"}>
                                        {status.isActive ? 'Executing' : 'Idle'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}

                    {botId === 'trend' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                <p className="text-sm font-medium mb-3">Current Active Position</p>
                                {status.currentPosition ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className={cn(
                                                status.currentPosition.side === 'buy' ? "text-success border-success" : "text-destructive border-destructive"
                                            )}>
                                                {status.currentPosition.side.toUpperCase()}
                                            </Badge>
                                            <span className="font-mono text-lg">${status.currentPosition.entryPrice?.toFixed(2)}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Amount: {status.currentPosition.amount}</p>
                                            <p className="text-xs text-muted-foreground">Confidence: {status.currentPosition.confidence.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">No active trend position.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {botId === 'swing' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                <p className="text-sm font-medium mb-3">Open Swing Positions ({status.openPositions})</p>
                                {status.currentPositions?.length > 0 ? (
                                    <div className="space-y-3">
                                        {status.currentPositions.map((pos: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-background rounded border border-border">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className={cn(
                                                        pos.side === 'buy' ? "text-success border-success" : "text-destructive border-destructive"
                                                    )}>
                                                        {pos.side.toUpperCase()}
                                                    </Badge>
                                                    <span className="font-mono">${pos.entryPrice?.toFixed(2)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">Amount: {pos.amount.toFixed(4)}</p>
                                                    <p className="text-xs text-muted-foreground">Target (3d): ${pos.target3d?.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">No open swing positions.</p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
