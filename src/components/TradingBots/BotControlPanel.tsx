import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bot, Play, Square, RefreshCw, TrendingUp, TrendingDown, Grid3X3, Activity, Settings } from 'lucide-react';
import { botManager } from '@/services/botManager';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function BotControlPanel() {
  const { selectedSymbol } = useStore();
  const navigate = useNavigate();
  const [botStatus, setBotStatus] = useState({
    grid: { isActive: false, gridLevels: 0, activeLevels: 0, totalProfit: 0, config: {} },
    trend: { isActive: false, currentPosition: null, totalTrades: 0, winRate: 0, totalPnL: 0, config: {} },
    swing: { isActive: false, openPositions: 0, totalTrades: 0, winRate: 0, totalPnL: 0, currentPositions: [], config: {} }
  });
  const [combinedPerformance, setCombinedPerformance] = useState({
    totalPnL: 0,
    activeBots: [] as string[],
    totalTrades: 0
  });
  const [isLoading, setIsLoading] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const status = botManager.getAllBotStatus();
      setBotStatus(status);
      const performance = botManager.getCombinedPerformance();
      setCombinedPerformance(performance);
    }, 5000);

    // Initial load
    const status = botManager.getAllBotStatus();
    setBotStatus(status);
    const performance = botManager.getCombinedPerformance();
    setCombinedPerformance(performance);

    return () => clearInterval(interval);
  }, []);

  const handleToggleBot = async (botName: 'grid' | 'trend' | 'swing') => {
    setIsLoading(botName);
    try {
      if (botStatus[botName].isActive) {
        await botManager.stopBot(botName);
        toast.success(`${botName.charAt(0).toUpperCase() + botName.slice(1)} bot stopped`);
      } else {
        await botManager.startBot(botName, selectedSymbol);
        toast.success(`${botName.charAt(0).toUpperCase() + botName.slice(1)} bot started`);
      }

      const status = botManager.getAllBotStatus();
      setBotStatus(status);
    } catch (error) {
      toast.error(`Error toggling ${botName} bot`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleStartAll = async () => {
    setIsLoading('all');
    try {
      await botManager.startAllBots(selectedSymbol);
      toast.success('All bots started');
      const status = botManager.getAllBotStatus();
      setBotStatus(status);
    } catch (error) {
      toast.error('Error starting bots');
    } finally {
      setIsLoading(null);
    }
  };

  const handleStopAll = async () => {
    setIsLoading('all');
    try {
      await botManager.stopAllBots();
      toast.success('All bots stopped');
      const status = botManager.getAllBotStatus();
      setBotStatus(status);
    } catch (error) {
      toast.error('Error stopping bots');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Trading Bots Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total P&L</p>
              <p className={cn(
                "text-2xl font-bold font-mono",
                combinedPerformance.totalPnL >= 0 ? "text-success" : "text-destructive"
              )}>
                ${combinedPerformance.totalPnL.toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">Active Bots</p>
              <p className="text-2xl font-bold">{combinedPerformance.activeBots.length}</p>
              <p className="text-xs text-muted-foreground">
                {combinedPerformance.activeBots.join(', ') || 'None'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
              <p className="text-2xl font-bold">{combinedPerformance.totalTrades}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStartAll}
              disabled={isLoading === 'all'}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start All Bots
            </Button>
            <Button
              variant="outline"
              onClick={handleStopAll}
              disabled={isLoading === 'all'}
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop All Bots
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid Trading Bot */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Grid3X3 className="w-5 h-5 text-primary" />
              Grid Trading Bot
            </CardTitle>
            <Badge variant={botStatus.grid.isActive ? "default" : "secondary"}>
              {botStatus.grid.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Triggers when 1h and 1d ML predictions show low confidence or sideways sentiment. Places multiple buy/sell orders at fixed grid levels to capture sideways volatility.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Grid Levels</p>
              <p className="text-lg font-semibold">{botStatus.grid.gridLevels || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Active Levels</p>
              <p className="text-lg font-semibold">{botStatus.grid.activeLevels || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Total Profit</p>
              <p className={cn(
                "text-lg font-semibold",
                (botStatus.grid.totalProfit || 0) >= 0 ? "text-success" : "text-destructive"
              )}>
                ${(botStatus.grid.totalProfit || 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Grid Spacing</p>
              <p className="text-lg font-semibold">5%</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => navigate('/trading-bots/grid')}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Strategy
            </Button>
            <div className="flex items-center gap-3">
              <Label htmlFor="grid-toggle" className="text-sm font-medium">Enable Bot</Label>
              <Switch
                id="grid-toggle"
                checked={botStatus.grid.isActive}
                onCheckedChange={() => handleToggleBot('grid')}
                disabled={isLoading === 'grid'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Trading Bot */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-success" />
              Trend/Momentum Bot
            </CardTitle>
            <Badge variant={botStatus.trend.isActive ? "default" : "secondary"}>
              {botStatus.trend.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Waits for 1h, 4h, and 1d ML predictions to agree perfectly before entering directional trades, monitored dynamically with trailing stops.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-lg font-semibold">{botStatus.trend.totalTrades || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-semibold">{(botStatus.trend.winRate || 0).toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Total P&L</p>
              <p className={cn(
                "text-lg font-semibold",
                (botStatus.trend.totalPnL || 0) >= 0 ? "text-success" : "text-destructive"
              )}>
                ${(botStatus.trend.totalPnL || 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Position</p>
              <p className="text-lg font-semibold">
                {botStatus.trend.currentPosition
                  ? (botStatus.trend.currentPosition as any).side?.toUpperCase()
                  : 'None'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => navigate('/trading-bots/trend')}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Strategy
            </Button>
            <div className="flex items-center gap-3">
              <Label htmlFor="trend-toggle" className="text-sm font-medium">Enable Bot</Label>
              <Switch
                id="trend-toggle"
                checked={botStatus.trend.isActive}
                onCheckedChange={() => handleToggleBot('trend')}
                disabled={isLoading === 'trend'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swing Trading Bot */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-warning" />
              Swing Trading Bot
            </CardTitle>
            <Badge variant={botStatus.swing.isActive ? "default" : "secondary"}>
              {botStatus.swing.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Follows the 3d and 7d ML predictions for longer 3-7 day holds. Takes partial profits at 3-day targets.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Open Positions</p>
              <p className="text-lg font-semibold">{botStatus.swing.openPositions || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-lg font-semibold">{botStatus.swing.totalTrades || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-semibold">{(botStatus.swing.winRate || 0).toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Total P&L</p>
              <p className={cn(
                "text-lg font-semibold",
                (botStatus.swing.totalPnL || 0) >= 0 ? "text-success" : "text-destructive"
              )}>
                ${(botStatus.swing.totalPnL || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {botStatus.swing.currentPositions?.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium mb-2">Active Positions</p>
              {botStatus.swing.currentPositions.map((pos: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className={cn(
                    pos.side === 'buy' ? "text-success" : "text-destructive"
                  )}>
                    {pos.side?.toUpperCase()}
                  </Badge>
                  <span className="font-mono">${pos.entryPrice?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => navigate('/trading-bots/swing')}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Strategy
            </Button>
            <div className="flex items-center gap-3">
              <Label htmlFor="swing-toggle" className="text-sm font-medium">Enable Bot</Label>
              <Switch
                id="swing-toggle"
                checked={botStatus.swing.isActive}
                onCheckedChange={() => handleToggleBot('swing')}
                disabled={isLoading === 'swing'}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BotControlPanel;
