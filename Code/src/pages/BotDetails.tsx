import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Square, Settings, Activity, BarChart3, Bot } from 'lucide-react';
import { botManager } from '@/services/botManager';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

// Specific config forms
import { GridBotConfig } from '@/components/TradingBots/GridBotConfig';
import { TrendBotConfig } from '@/components/TradingBots/TrendBotConfig';
import { SwingBotConfig } from '@/components/TradingBots/SwingBotConfig';

// Generic performance & live
import { BotPerformancePanel } from '@/components/TradingBots/BotPerformancePanel';
import { BotLivePanel } from '@/components/TradingBots/BotLivePanel';

export default function BotDetails() {
    const { botId } = useParams<{ botId: string }>();
    const navigate = useNavigate();
    const { selectedSymbol } = useStore();
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!botId || !['grid', 'trend', 'swing'].includes(botId)) {
            navigate('/trading-bots');
            return;
        }

        const checkStatus = () => {
            const status = botManager.getAllBotStatus();
            if (botId === 'grid') setIsActive(status.grid.isActive);
            if (botId === 'trend') setIsActive(status.trend.isActive);
            if (botId === 'swing') setIsActive(status.swing.isActive);
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [botId, navigate]);

    const toggleBot = async () => {
        if (!botId) return;
        setIsLoading(true);
        try {
            if (isActive) {
                await botManager.stopBot(botId as 'grid' | 'trend' | 'swing');
                toast.success(`${botId.toUpperCase()} bot stopped`);
                setIsActive(false);
            } else {
                await botManager.startBot(botId as 'grid' | 'trend' | 'swing', selectedSymbol);
                toast.success(`${botId.toUpperCase()} bot started on ${selectedSymbol}`);
                setIsActive(true);
            }
        } catch (error) {
            toast.error(`Error toggling ${botId} bot`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!botId) return null;

    const botTitle = botId.charAt(0).toUpperCase() + botId.slice(1) + ' Trading Bot';

    return (
        <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/trading-bots')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{botTitle}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-success' : 'bg-muted'}`} />
                            {isActive ? 'Running' : 'Stopped'}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={toggleBot}
                    disabled={isLoading}
                    variant={isActive ? "destructive" : "default"}
                >
                    {isActive ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isActive ? 'Stop Bot' : 'Start Bot'}
                </Button>
            </div>

            <Tabs defaultValue="config" className="w-full">
                <TabsList className="grid w-full mb-8" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <TabsTrigger value="config" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Configuration
                    </TabsTrigger>
                    <TabsTrigger value="live" className="flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Live Monitoring
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Performance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="mt-0">
                    {botId === 'grid' && <GridBotConfig />}
                    {botId === 'trend' && <TrendBotConfig />}
                    {botId === 'swing' && <SwingBotConfig />}
                </TabsContent>

                <TabsContent value="live" className="mt-0">
                    <BotLivePanel botId={botId} />
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                    <BotPerformancePanel botId={botId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
