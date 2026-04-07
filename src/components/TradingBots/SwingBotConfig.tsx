import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { swingTradingBot } from '@/services/tradingStrategies/swingTradingBot';

export function SwingBotConfig() {
    const [config, setConfig] = useState({
        capital: 2000,
        positionSize: 0.15,
        minConfidence7d: 65,
        minSentiment24h: 0,
        partialExitPercent: 0.5,
        holdDays: 7,
        stopLossPercent: 0.15
    });

    useEffect(() => {
        const status = swingTradingBot.getStatus();
        if (status.config) {
            setConfig(prev => ({ ...prev, ...status.config }));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handeSave = () => {
        swingTradingBot.updateConfig(config);
        toast.success('Swing Bot configuration saved');
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Trade Settings</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="capital">Capital Allocation ($)</Label>
                        <Input id="capital" name="capital" type="number" value={config.capital} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="positionSize">Position Size (BTC)</Label>
                        <Input id="positionSize" name="positionSize" type="number" step="0.01" value={config.positionSize} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="holdDays">Holding Period (Days)</Label>
                        <Input id="holdDays" name="holdDays" type="number" value={config.holdDays} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="partialExitPercent">Partial Profit Level (%)</Label>
                        <Input id="partialExitPercent" name="partialExitPercent" type="number" step="0.01" value={config.partialExitPercent} onChange={handleChange} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Entry Signals & Filters</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="minConfidence7d">7-Day Prediction Confidence (%)</Label>
                        <Input id="minConfidence7d" name="minConfidence7d" type="number" value={config.minConfidence7d} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minSentiment24h">24h Sentiment Filter Override</Label>
                        <Input id="minSentiment24h" name="minSentiment24h" type="number" step="0.1" value={config.minSentiment24h} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stopLossPercent">Stop Loss (%)</Label>
                        <Input id="stopLossPercent" name="stopLossPercent" type="number" step="0.01" value={config.stopLossPercent} onChange={handleChange} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handeSave} size="lg">Save Configuration</Button>
            </div>
        </div>
    );
}
