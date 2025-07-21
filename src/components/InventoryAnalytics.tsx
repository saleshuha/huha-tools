import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useInventoryAnalytics } from '@/hooks/useInventoryAnalytics';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  RefreshCw,
  Brain,
  Clock,
  Target
} from 'lucide-react';

export function InventoryAnalytics() {
  const { 
    restockItems, 
    salesAnalytics, 
    loading, 
    loadAnalytics,
    getAIInsights 
  } = useInventoryAnalytics();

  const insights = getAIInsights();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading AI Analytics...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Panel */}
      <Card className="p-6 gradient-border">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-bold">AI Insights & Recommendations</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAnalytics}
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No insights available. Add inventory items to get AI recommendations.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'critical' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : insight.type === 'warning'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : insight.type === 'prediction'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {insight.type === 'critical' && <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />}
                  {insight.type === 'warning' && <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />}
                  {insight.type === 'prediction' && <Brain className="w-5 h-5 text-purple-600 mt-0.5" />}
                  {insight.type === 'info' && <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />}
                  
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{insight.message}</p>
                    <Badge variant="outline" className="text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      {insight.action}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Restock Alert Panel */}
      {restockItems.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h3 className="text-xl font-bold">Items Needing Restock</h3>
            <Badge variant="secondary">{restockItems.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {restockItems.slice(0, 5).map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{item.identifier}</p>
                   <p className="text-sm text-muted-foreground">
                     Current: {item.current_quantity}
                   </p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={item.current_quantity <= 1 ? "destructive" : "secondary"}
                    className="mb-1"
                  >
                    {item.current_quantity <= 1 ? "Critical" : "Low Stock"}
                  </Badge>
                  {item.days_since_last_restock && (
                    <p className="text-xs text-muted-foreground">
                      Last restock: {item.days_since_last_restock} days ago
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {restockItems.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{restockItems.length - 5} more items need attention
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Sales Analytics Panel */}
      {salesAnalytics.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold">Sales Performance Analytics</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {salesAnalytics.map((analytics, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-3 text-lg">{analytics.product_type} Inventory</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Sold:</span>
                    <Badge variant="secondary">{analytics.total_sold}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Days to Sell:</span>
                    <span className="font-medium">{Math.round(analytics.avg_days_to_sell)}</span>
                  </div>
                  {analytics.fastest_selling_item !== 'N/A' && (
                    <div className="flex justify-between">
                      <span>Fastest Seller:</span>
                      <span className="font-medium text-green-600 text-sm truncate max-w-32">
                        {analytics.fastest_selling_item}
                      </span>
                    </div>
                  )}
                  {analytics.slowest_selling_item !== 'N/A' && (
                    <div className="flex justify-between">
                      <span>Slowest Seller:</span>
                      <span className="font-medium text-orange-600 text-sm truncate max-w-32">
                        {analytics.slowest_selling_item}
                      </span>
                    </div>
                  )}
                  {analytics.restock_frequency_days > 0 && (
                    <div className="flex justify-between">
                      <span>Restock Frequency:</span>
                      <span className="font-medium">{Math.round(analytics.restock_frequency_days)} days</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}