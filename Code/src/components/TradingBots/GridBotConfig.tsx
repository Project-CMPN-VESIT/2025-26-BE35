import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { gridTradingBot } from '@/services/tradingStrategies/gridTradingBot';

export function GridBotConfig() {
    const [config, setConfig] = useState({
        capital: 1000,
        gridCount: 10,
        rangePercent: 0.05,
        quantityPerLevel: 0.01,
        profitPercent: 0.01,
        stopLossPercent: 0.05,
        maxTrades: 50
    });

    useEffect(() => {
        // Load config from bot instance
        const status = gridTradingBot.getStatus();
        if (status.config) {
            setConfig(prev => ({ ...prev, ...status.config }));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handeSave = () => {
        gridTradingBot.updateConfig(config);
        toast.success('Grid Bot configuration saved');
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Trading Parameters</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="capital">Capital Allocation ($)</Label>
                        <Input id="capital" name="capital" type="number" value={config.capital} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gridCount">Grid Levels</Label>
                        <Input id="gridCount" name="gridCount" type="number" value={config.gridCount} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rangePercent">Grid Range (%)</Label>
                        <Input id="rangePercent" name="rangePercent" type="number" step="0.01" value={config.rangePercent} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantityPerLevel">Quantity Per Level</Label>
                        <Input id="quantityPerLevel" name="quantityPerLevel" type="number" step="0.001" value={config.quantityPerLevel} onChange={handleChange} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Risk Management</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="stopLossPercent">Stop Loss (%)</Label>
                        <Input id="stopLossPercent" name="stopLossPercent" type="number" step="0.01" value={config.stopLossPercent} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profitPercent">Take Profit per Grid (%)</Label>
                        <Input id="profitPercent" name="profitPercent" type="number" step="0.01" value={config.profitPercent} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maxTrades">Max Consecutive Trades</Label>
                        <Input id="maxTrades" name="maxTrades" type="number" value={config.maxTrades} onChange={handleChange} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handeSave} size="lg">Save Configuration</Button>
            </div>
        </div>
    );
}
