import { Newspaper, TrendingUp, Search, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SentimentGauge } from "@/components/shared/SentimentGauge";
import { useStore } from "@/store/useStore";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function NewsSentiment() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  
  const { sentiment, news } = useStore();
  const { refreshSentiment } = useRealTimeData();

  const sentimentTrends = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    overall: 0.3 + Math.random() * 0.4,
    news: 0.2 + Math.random() * 0.5,
    social: 0.1 + Math.random() * 0.6,
    market: 0.25 + Math.random() * 0.45,
  }));

  const sentimentBySources = [
    { name: "Traditional Media", value: 25, sentiment: 0.45 },
    { name: "Crypto Media", value: 35, sentiment: 0.72 },
    { name: "Social Media", value: 30, sentiment: 0.58 },
    { name: "Official Sources", value: 10, sentiment: 0.65 },
  ];

  const topTopics = [
    { topic: "ETF Inflows", mentions: 847, trend: "+15%" },
    { topic: "Fed Policy", mentions: 623, trend: "+8%" },
    { topic: "Bitcoin Halving", mentions: 512, trend: "+23%" },
    { topic: "Mining Difficulty", mentions: 389, trend: "-5%" },
    { topic: "Institutional Adoption", mentions: 345, trend: "+12%" },
    { topic: "Regulatory News", mentions: 298, trend: "+3%" },
  ];

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--success))",
    "hsl(var(--chart-volume))",
    "hsl(var(--warning))",
  ];

  const getSentimentBadge = (sentimentScore: number) => {
    if (sentimentScore > 0.3) {
      return <Badge className="bg-success/20 text-success border-success/30">Bullish</Badge>;
    } else if (sentimentScore < -0.3) {
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Bearish</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-muted-foreground/30">Neutral</Badge>;
  };

  const filteredNews = news.filter(item => {
    const matchesSearch = searchQuery === "" || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" ||
      (sentimentFilter === "bullish" && item.sentiment > 0.3) ||
      (sentimentFilter === "bearish" && item.sentiment < -0.3) ||
      (sentimentFilter === "neutral" && item.sentiment >= -0.3 && item.sentiment <= 0.3);
    return matchesSearch && matchesSentiment;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">News & Sentiment</h1>
          <p className="text-muted-foreground text-sm">
            Real-time market sentiment analysis from news and social media
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshSentiment}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Current Sentiment Overview */}
      <Card className="bg-card border-border">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-semibold text-muted-foreground mb-2">Current Market Sentiment</h2>
              <div className="text-6xl font-bold text-gradient-gold mb-2">
                {sentiment ? (sentiment.score > 0 ? "+" : "") + sentiment.score.toFixed(2) : "0.00"}
              </div>
              <Badge className={cn(
                "text-lg px-4 py-1",
                sentiment?.label === "BULLISH" && "bg-success/20 text-success border-success/30",
                sentiment?.label === "BEARISH" && "bg-destructive/20 text-destructive border-destructive/30",
                sentiment?.label === "NEUTRAL" && "bg-muted text-muted-foreground"
              )}>
                {sentiment?.label || "NEUTRAL"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Confidence: {sentiment?.confidence.toFixed(0) || 0}% • Based on {sentiment?.newsVolume || 0} sources
              </p>
            </div>
            <SentimentGauge score={sentiment?.score || 0} size="lg" />
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Trends Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Sentiment Trends (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 1]} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [value.toFixed(2), '']}
                />
                <Legend />
                <Line type="monotone" dataKey="overall" name="Overall" stroke="hsl(var(--foreground))" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="news" name="News" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="social" name="Social Media" stroke="hsl(var(--chart-volume))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="market" name="Market" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-primary" />
                  Latest News ({filteredNews.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search news..." 
                      className="pl-9 w-[180px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="bullish">Bullish</SelectItem>
                      <SelectItem value="bearish">Bearish</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredNews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No news articles found</p>
              ) : (
                filteredNews.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold hover:text-primary cursor-pointer transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium">{item.source}</span>
                          <span>•</span>
                          <span>{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      {getSentimentBadge(item.sentiment)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          Sentiment: <span className={cn(
                            "font-semibold",
                            item.sentiment > 0.3 ? "text-success" : item.sentiment < -0.3 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {item.sentiment > 0 ? "+" : ""}{item.sentiment.toFixed(2)}
                          </span>
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => item.url && item.url !== '#' && window.open(item.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Read More
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Analytics */}
        <div className="space-y-6">
          {/* Sentiment by Source */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Sentiment by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentBySources}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sentimentBySources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {sentimentBySources.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className={cn(
                      "font-mono font-semibold",
                      item.sentiment > 0.5 ? "text-success" : item.sentiment < 0.3 ? "text-destructive" : "text-warning"
                    )}>
                      {item.sentiment.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Topics */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Key Topics Detected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topTopics.map((topic, index) => (
                  <div 
                    key={topic.topic}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-mono w-5">#{index + 1}</span>
                      <span className="font-medium text-sm">{topic.topic}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{topic.mentions}</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        topic.trend.startsWith("+") ? "text-success" : "text-destructive"
                      )}>
                        {topic.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Impact */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Sentiment Impact on Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">Correlation Score</div>
                  <div className="text-3xl font-bold text-primary">0.73</div>
                  <div className="text-xs text-muted-foreground mt-1">Strong positive correlation</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>When sentiment increased by 0.1:</p>
                  <ul className="mt-2 space-y-1">
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-success" />
                      <span>Short-term predictions up <span className="text-success">+0.8%</span></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-success" />
                      <span>Confidence increased by <span className="text-success">+2.3%</span></span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
