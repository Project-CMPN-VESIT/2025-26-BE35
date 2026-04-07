import { Bot } from 'lucide-react';
import BotControlPanel from '@/components/TradingBots/BotControlPanel';
import { useRealTimeData } from '@/hooks/useRealTimeData';

export default function TradingBots() {
  // Initialize real-time data
  useRealTimeData();

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-fade-in max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Bot className="w-8 h-8 text-primary" />
          Automated Trading Bots
        </h1>
        <p className="text-muted-foreground">
          AI-powered trading strategies that execute based on predictions and market conditions
        </p>
      </div>

      {/* Bot Control Panel */}
      <BotControlPanel />
    </div>
  );
}
