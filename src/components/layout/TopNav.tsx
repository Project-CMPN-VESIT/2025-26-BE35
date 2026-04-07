import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  TrendingUp, 
  LineChart, 
  Shield, 
  Blocks, 
  BarChart3, 
  Newspaper, 
  Activity,
  Bell,
  Settings,
  Menu,
  X,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/predictions", label: "Predictions", icon: TrendingUp },
  { path: "/trading", label: "Trading", icon: LineChart },
  { path: "/trading-bots", label: "Trading Bots", icon: Bot },
  { path: "/security", label: "Security Monitor", icon: Shield },
  { path: "/blockchain", label: "Blockchain Verification", icon: Blocks },
  { path: "/analytics", label: "Performance Analytics", icon: BarChart3 },
  { path: "/news", label: "News & Sentiment", icon: Newspaper },
  { path: "/system", label: "System Status", icon: Activity },
];

export function TopNav() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentPrice, priceStats, wsConnected, selectedSymbol } = useStore();
  
  const symbolName = selectedSymbol?.replace('USDT', '') || 'BTC';
  const changePercent = priceStats?.changePercent24h || 0;
  const isPositive = changePercent >= 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mr-8 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-lg group-hover:shadow-black/30 transition-shadow">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full pulse-live ring-2 ring-background" />
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:block tracking-tight">IntelliDex</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                <span className="hidden xl:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Live Price Ticker */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-card/80 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                wsConnected ? "bg-success pulse-live" : "bg-warning"
              )} />
              <span className="text-xs font-medium text-muted-foreground">{symbolName}</span>
            </div>
            <span className="text-sm font-mono font-bold tracking-tight">
              {currentPrice 
                ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '---'
              }
            </span>
            {priceStats && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-semibold px-2",
                  isPositive 
                    ? "bg-success/10 text-success border-success/20" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </Badge>
            )}
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-border">
                <h4 className="font-semibold">Notifications</h4>
              </div>
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-success" />
                  <div>
                    <p className="text-sm font-medium">Prediction Verified</p>
                    <p className="text-xs text-muted-foreground">1H prediction achieved 94% accuracy</p>
                    <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-warning" />
                  <div>
                    <p className="text-sm font-medium">High Volatility Alert</p>
                    <p className="text-xs text-muted-foreground">BTC volatility increased by 15%</p>
                    <p className="text-xs text-muted-foreground mt-1">15 minutes ago</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 cursor-pointer">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">Model Updated</p>
                    <p className="text-xs text-muted-foreground">Transformer model retrained with latest data</p>
                    <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <Settings className="w-5 h-5" />
            </Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="lg:hidden border-t border-border p-4 bg-background animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
