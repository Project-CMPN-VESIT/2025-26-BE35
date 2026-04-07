import { TrendingUp, Newspaper, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SentimentGauge } from "@/components/shared/SentimentGauge";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { useStore } from "@/store/useStore";

export function SentimentCard() {
  const { sentiment, news } = useStore();
  
  const sentimentHistory = [0.45, 0.52, 0.48, 0.55, 0.60, 0.58, 0.62, sentiment?.score || 0.65];

  return (
    <Card className="card-interactive">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          Market Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex justify-center py-2">
          <SentimentGauge score={sentiment?.score || 0} size="md" />
        </div>

        <div className="space-y-3 p-3 rounded-xl bg-muted/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trend</span>
            <div className="flex items-center gap-2.5">
              <MiniSparkline data={sentimentHistory} color="success" height={20} className="w-16" />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                (sentiment?.score || 0) > 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
              }`}>
                {(sentiment?.score || 0) > 0 ? 'Rising' : 'Falling'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">News Volume</span>
            <span className="font-mono-numbers font-medium">{sentiment?.newsVolume || 0} articles</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-3 border-t border-border/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Headlines</span>
          {(sentiment?.topHeadlines || news.slice(0, 2)).slice(0, 2).map((headline, index) => (
            <div key={index} className="group flex gap-2.5 text-xs p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
              <Newspaper className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                {typeof headline === 'string' ? headline : headline.title}
              </span>
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
