import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trendTradingBot } from '@/services/tradingStrategies/trendTradingBot';

export function TrendBotConfig() {
    const [config, setConfig] = useState({
        capital: 1000,
        positionSize: 0.1,
        minConfidence: 75,
        minSentiment: 0,
        trailingStopPercent: 0.02,
        takeProfitPercent: 0.10,
        maxDailyLoss: 50
    });

    useEffect(() => {
        const status = trendTradingBot.getStatus();
        if (status.config) {
            setConfig(prev => ({ ...prev, ...status.config }));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handeSave = () => {
        trendTradingBot.updateConfig(config);
        toast.success('Trend Bot configuration saved');
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
                        <Label htmlFor="trailingStopPercent">Trailing Stop (%)</Label>
                        <Input id="trailingStopPercent" name="trailingStopPercent" type="number" step="0.01" value={config.trailingStopPercent} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="takeProfitPercent">Take Profit (%)</Label>
                        <Input id="takeProfitPercent" name="takeProfitPercent" type="number" step="0.01" value={config.takeProfitPercent} onChange={handleChange} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>AI Integration Filters</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="minConfidence">Prediction Confidence Threshold (%)</Label>
                        <Input id="minConfidence" name="minConfidence" type="number" value={config.minConfidence} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="minSentiment">Trend Strength Score Threshold</Label>
                        <Input id="minSentiment" name="minSentiment" type="number" step="0.1" value={config.minSentiment} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maxDailyLoss">Max Daily Loss ($)</Label>
                        <Input id="maxDailyLoss" name="maxDailyLoss" type="number" value={config.maxDailyLoss} onChange={handleChange} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handeSave} size="lg">Save Configuration</Button>
            </div>
        </div>
    );
}
