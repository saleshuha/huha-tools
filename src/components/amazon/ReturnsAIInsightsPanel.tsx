import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, TrendingDown, AlertTriangle, DollarSign, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { AIInsights } from '@/types/amazon-returns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ReturnsAIInsightsPanelProps {
  insights: AIInsights | null;
  loading: boolean;
  onRefresh: () => void;
}

export const ReturnsAIInsightsPanel: React.FC<ReturnsAIInsightsPanelProps> = ({
  insights,
  loading,
  onRefresh,
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const toggleItem = (asin: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(asin)) {
      newExpanded.delete(asin);
    } else {
      newExpanded.add(asin);
    }
    setExpandedItems(newExpanded);
  };

  const getUrgencyColor = (urgency: 'critical' | 'high' | 'medium') => {
    switch (urgency) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
    }
  };

  const getUrgencyIcon = (urgency: 'critical' | 'high' | 'medium') => {
    switch (urgency) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <TrendingDown className="w-4 h-4" />;
      case 'medium':
        return <TrendingDown className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>Analyzing return patterns...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>Get intelligent recommendations to reduce returns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Click the button below to generate AI-powered insights about your return patterns
            </p>
            <Button onClick={onRefresh} size="lg">
              <Brain className="w-4 h-4 mr-2" />
              Generate AI Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              Generated {new Date(insights.generated_at).toLocaleString()}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Executive Summary
          </h3>
          <p className="text-sm text-muted-foreground">{insights.overall_insights}</p>
        </div>

        {/* Cost Impact */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Return Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${insights.cost_impact.total_returned_value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Based on avg. cost/return</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Estimated Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ${insights.cost_impact.estimated_loss.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Unrecoverable costs</p>
            </CardContent>
          </Card>
        </div>

        {/* High Priority Items */}
        {insights.high_priority_items.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Items Requiring Action ({insights.high_priority_items.length})
            </h3>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {insights.high_priority_items.map((item) => (
                  <Collapsible key={item.asin}>
                    <Card className="border-l-4" style={{
                      borderLeftColor: item.urgency === 'critical' ? 'hsl(var(--destructive))' : 
                                      item.urgency === 'high' ? 'hsl(25, 95%, 53%)' : 
                                      'hsl(45, 93%, 47%)'
                    }}>
                      <CollapsibleTrigger
                        className="w-full"
                        onClick={() => toggleItem(item.asin)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getUrgencyColor(item.urgency)}>
                                  {getUrgencyIcon(item.urgency)}
                                  <span className="ml-1">{item.urgency.toUpperCase()}</span>
                                </Badge>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {item.asin}
                                </code>
                              </div>
                              <CardTitle className="text-sm font-medium line-clamp-1">
                                {item.product_title || 'Product Title Not Available'}
                              </CardTitle>
                              {item.return_ratio !== undefined && (
                                <CardDescription className="text-xs mt-1">
                                  {item.return_ratio.toFixed(1)}% return rate • 
                                  {item.returned_units}/{item.shipped_units} units • 
                                  Priority: {item.priority_score?.toFixed(1)}
                                </CardDescription>
                              )}
                            </div>
                            {expandedItems.has(item.asin) ? (
                              <ChevronUp className="w-4 h-4 ml-2 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          <div className="space-y-2">
                            <div>
                              <h4 className="text-xs font-semibold mb-1 text-muted-foreground">
                                Root Cause Analysis
                              </h4>
                              <p className="text-sm">{item.reason}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold mb-1 text-muted-foreground">
                                Recommended Action
                              </h4>
                              <p className="text-sm font-medium text-primary">
                                {item.recommendation}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Patterns Detected */}
        {insights.patterns_detected.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Patterns Detected
            </h3>
            <div className="space-y-2">
              {insights.patterns_detected.map((pattern, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{idx + 1}</span>
                  </div>
                  <p className="text-sm flex-1">{pattern}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
