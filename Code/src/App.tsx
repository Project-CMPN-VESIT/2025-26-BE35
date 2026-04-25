import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Predictions from "./pages/Predictions";
import Trading from "./pages/Trading";
import TradingBots from "./pages/TradingBots";
import SecurityMonitor from "./pages/SecurityMonitor";
import BlockchainVerification from "./pages/BlockchainVerification";
import Analytics from "./pages/Analytics";
import NewsSentiment from "./pages/NewsSentiment";
import BotDetails from "./pages/BotDetails";
import SystemStatus from "./pages/SystemStatus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/trading" element={<Trading />} />
            <Route path="/trading-bots" element={<TradingBots />} />
            <Route path="/trading-bots/:botId" element={<BotDetails />} />
            <Route path="/security" element={<SecurityMonitor />} />
            <Route path="/blockchain" element={<BlockchainVerification />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/news" element={<NewsSentiment />} />
            <Route path="/system" element={<SystemStatus />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
