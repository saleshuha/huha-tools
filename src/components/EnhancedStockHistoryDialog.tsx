import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { HuhaTab01 } from './ui/huha-tab-01';
import { useEnhancedStockAnalytics, InventoryItemAnalysis, StockLifecycleEvent } from '@/hooks/useEnhancedStockAnalytics';
import { 
  History, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  BarChart3, 
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Truck,
  ShoppingCart,
  Zap,
  Award
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface EnhancedStockHistoryDialogProps {
  inventoryId?: string;
  itemIdentifier?: string;
  inventoryType?: 'asin' | 'sku';
  triggerVariant?: 'icon' | 'full';
}

export function EnhancedStockHistoryDialog({ 
  inventoryId, 
  itemIdentifier, 
  inventoryType,
  triggerVariant = 'icon'
}: EnhancedStockHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('asin');
  const [selectedItem, setSelectedItem] = useState<InventoryItemAnalysis | null>(null);
  
  const { asinAnalytics, skuAnalytics, loading, loadItemAnalysis } = useEnhancedStockAnalytics();

  useEffect(() => {
    if (open && inventoryId && inventoryType) {
      loadItemAnalysis(inventoryId, inventoryType).then(analysis => {
        if (analysis) {
          setSelectedItem(analysis);
          setActiveTab(inventoryType);
        }
      });
    }
  }, [open, inventoryId, inventoryType]);

  const renderTrigger = () => {
    if (triggerVariant === 'full') {
      return (
        <Button variant="outline" className="w-full">
          <History className="w-4 h-4 mr-2" />
          Advanced Stock Analytics
        </Button>
      );
    }
    
    return (
      <Button variant="outline" size="sm" className="w-8 h-8 p-0" title="Advanced stock analytics">
        <History className="w-4 h-4" />
      </Button>
    );
  };

  const renderLifecycleTimeline = (events: StockLifecycleEvent[]) => {
    return (
      <div className="space-y-3">
        {events.map((event, index) => {
          const isPositive = event.quantity_change > 0;
          const isNeutral = event.quantity_change === 0;
          
          return (
            <Card key={event.id} className="relative">
              <CardContent className="p-4">
                {/* Timeline connector */}
                {index < events.length - 1 && (
                  <div className="absolute left-6 top-12 w-px h-8 bg-border" />
                )}
                
                <div className="flex items-start gap-4">
                  {/* Event icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    event.event_type === 'addition' ? 'bg-blue-100 text-blue-600' :
                    event.event_type === 'sale' ? 'bg-red-100 text-red-600' :
                    event.event_type === 'order_placed' ? 'bg-orange-100 text-orange-600' :
                    event.event_type === 'restock' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {event.event_type === 'addition' && <Package className="w-4 h-4" />}
                    {event.event_type === 'sale' && <TrendingDown className="w-4 h-4" />}
                    {event.event_type === 'order_placed' && <ShoppingCart className="w-4 h-4" />}
                    {event.event_type === 'restock' && <Truck className="w-4 h-4" />}
                    {event.event_type === 'adjustment' && <Activity className="w-4 h-4" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium capitalize">
                          {event.event_type.replace('_', ' ')}
                        </h4>
                        <Badge variant={isPositive ? 'default' : isNeutral ? 'secondary' : 'destructive'}>
                          {isPositive ? '+' : ''}{event.quantity_change}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Before:</span>
                        <div className="font-medium">{event.quantity_before}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">After:</span>
                        <div className="font-medium">{event.quantity_after}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Days from previous:</span>
                        <div className="font-medium">
                          {event.days_from_previous !== null ? `${event.days_from_previous}d` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    {event.event_details.reason && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {event.event_details.reason}
                      </div>
                    )}
                    
                    {event.event_details.po_number && (
                      <div className="mt-2">
                        <Badge variant="outline">PO: {event.event_details.po_number}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMetricsCards = (analysis: InventoryItemAnalysis) => {
    const { metrics } = analysis;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Performance Grade */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Performance Grade</span>
              <Award className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className={`text-2xl font-bold ${
              metrics.performance_grade === 'A' ? 'text-green-600' :
              metrics.performance_grade === 'B' ? 'text-blue-600' :
              metrics.performance_grade === 'C' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {metrics.performance_grade}
            </div>
            <Badge variant="outline" className="mt-2">
              {metrics.velocity_category}
            </Badge>
          </CardContent>
        </Card>

        {/* Sales Velocity */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Sales Velocity</span>
              <Zap className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.sales_velocity.toFixed(3)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">items/day</div>
          </CardContent>
        </Card>

        {/* Days to First Sale */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Days to First Sale</span>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.avg_days_to_first_sale}
            </div>
            <div className="text-xs text-muted-foreground mt-1">days</div>
          </CardContent>
        </Card>

        {/* Order to Restock */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Order → Restock</span>
              <Truck className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.avg_days_from_order_to_restock}
            </div>
            <div className="text-xs text-muted-foreground mt-1">days average</div>
          </CardContent>
        </Card>

        {/* Recommended Order Qty */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Recommended Order</span>
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.recommended_order_quantity}
            </div>
            <div className="text-xs text-muted-foreground mt-1">units</div>
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Stock Status</span>
              {analysis.current_quantity <= metrics.recommended_reorder_point ? 
                <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                <CheckCircle className="w-4 h-4 text-green-500" />
              }
            </div>
            <div className="text-2xl font-bold">
              {analysis.current_quantity}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Reorder at {metrics.recommended_reorder_point}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInventoryTab = (items: InventoryItemAnalysis[], type: 'asin' | 'sku') => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading {type.toUpperCase()} analytics...</span>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No {type.toUpperCase()} inventory found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {type.toUpperCase()} inventory items will appear here when available
          </p>
        </div>
      );
    }

    // Show single item analysis if selected
    if (selectedItem && selectedItem.table_name.includes(type)) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedItem.identifier}</h3>
              <p className="text-sm text-muted-foreground">
                Added {formatDistanceToNow(new Date(selectedItem.date_added), { addSuffix: true })}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              View All Items
            </Button>
          </div>

          {renderMetricsCards(selectedItem)}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Lifecycle Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderLifecycleTimeline(selectedItem.lifecycle_events)}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show list of items
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setSelectedItem(item)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.identifier}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.current_quantity} in stock
                    </p>
                  </div>
                  <Badge variant="outline">
                    Grade {item.metrics.performance_grade}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Velocity:</span>
                    <div className="font-medium">{item.metrics.sales_velocity.toFixed(3)}/day</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <div className="font-medium text-xs">{item.metrics.velocity_category}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Next reorder:</span>
                    <Badge variant={item.current_quantity <= item.metrics.recommended_reorder_point ? 'destructive' : 'secondary'}>
                      {item.metrics.recommended_order_quantity} units
                    </Badge>
                  </div>
                </div>

                {item.metrics.next_restock_suggestion && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-xs text-orange-800 dark:text-orange-400">
                    {item.metrics.next_restock_suggestion}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const tabItems = [
    {
      value: 'asin',
      label: 'ASIN Inventory',
      content: renderInventoryTab(asinAnalytics, 'asin')
    },
    {
      value: 'sku',
      label: 'SKU Inventory', 
      content: renderInventoryTab(skuAnalytics, 'sku')
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="w-6 h-6 text-primary" />
            Advanced Stock Analytics
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Comprehensive lifecycle analysis and performance metrics
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <HuhaTab01 
            items={tabItems}
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full"
            tabsContentClassName="h-full overflow-y-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}