import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useVelocityAnalytics } from '@/hooks/useVelocityAnalytics';
import { useEnhancedStockAnalytics, InventoryItemAnalysis, StockLifecycleEvent } from '@/hooks/useEnhancedStockAnalytics';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Target, Zap, Activity, History, Package, ShoppingCart, Truck, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { HuhaTab01 } from './ui/huha-tab-01';
import { Separator } from './ui/separator';
import { format, formatDistanceToNow } from 'date-fns';

export function VelocityDashboard() {
  const { velocityItems, velocityMetrics, loading, getUrgencyColor, getVelocityColor } = useVelocityAnalytics();
  const { asinAnalytics, skuAnalytics, loading: enhancedLoading, loadItemAnalysis } = useEnhancedStockAnalytics();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItemAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('velocity');

  const handleProductClick = async (itemId: string, inventoryType: 'asin' | 'sku') => {
    const analysis = await loadItemAnalysis(itemId, inventoryType);
    if (analysis) {
      setSelectedItem(analysis);
      setActiveTab('details');
    }
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
                {index < events.length - 1 && (
                  <div className="absolute left-6 top-12 w-px h-8 bg-border" />
                )}
                
                <div className="flex items-start gap-4">
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Stock Status</span>
              {analysis.current_quantity <= metrics.recommended_reorder_point ? 
                <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                <Activity className="w-4 h-4 text-green-500" />
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

  if (loading || enhancedLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getCategoryItems = (category: string) => {
    return velocityItems.filter(item => item.velocity_category === category);
  };

  const tabItems = [
    {
      value: 'velocity',
      label: 'Velocity Overview',
      content: (
        <div className="space-y-6">
          {/* Velocity Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory('Fast Moving')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fast Moving</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{velocityMetrics.fastMovingItems}</div>
                    <p className="text-xs text-muted-foreground">High velocity items</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Fast Moving Items</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-auto">
                  <VelocityItemsTable 
                    items={getCategoryItems('Fast Moving')} 
                    getUrgencyColor={getUrgencyColor} 
                    onProductClick={handleProductClick}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory('Medium Moving')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Medium Moving</CardTitle>
                    <Activity className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{velocityMetrics.mediumMovingItems}</div>
                    <p className="text-xs text-muted-foreground">Moderate velocity items</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Medium Moving Items</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-auto">
                  <VelocityItemsTable 
                    items={getCategoryItems('Medium Moving')} 
                    getUrgencyColor={getUrgencyColor}
                    onProductClick={handleProductClick}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory('Slow Moving')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Slow Moving</CardTitle>
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{velocityMetrics.slowMovingItems}</div>
                    <p className="text-xs text-muted-foreground">Low velocity items</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Slow Moving Items</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-auto">
                  <VelocityItemsTable 
                    items={getCategoryItems('Slow Moving')} 
                    getUrgencyColor={getUrgencyColor}
                    onProductClick={handleProductClick}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory('No Sales')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">No Sales</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{velocityMetrics.noSalesItems}</div>
                    <p className="text-xs text-muted-foreground">Items with no sales</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-6xl">
                <DialogHeader>
                  <DialogTitle>No Sales Items</DialogTitle>
                </DialogHeader>
                <div className="max-h-96 overflow-auto">
                  <VelocityItemsTable 
                    items={getCategoryItems('No Sales')} 
                    getUrgencyColor={getUrgencyColor}
                    onProductClick={handleProductClick}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Critical Items Section */}
          {velocityMetrics.criticalItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Critical Items Requiring Immediate Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VelocityItemsTable 
                  items={velocityMetrics.criticalItems} 
                  getUrgencyColor={getUrgencyColor} 
                  showActions 
                  onProductClick={handleProductClick}
                />
              </CardContent>
            </Card>
          )}

          {/* Top Performers Section */}
          {velocityMetrics.topPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Top Performing Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VelocityItemsTable 
                  items={velocityMetrics.topPerformers} 
                  getUrgencyColor={getUrgencyColor}
                  onProductClick={handleProductClick}
                />
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Average Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{velocityMetrics.avgVelocity.toFixed(3)}</div>
                <p className="text-xs text-muted-foreground">Items sold per day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Urgent Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{velocityMetrics.totalUrgentItems}</div>
                <p className="text-xs text-muted-foreground">Items needing immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Stock Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{velocityMetrics.avgStockDays.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Days of inventory remaining</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      value: 'asin',
      label: 'ASIN Analytics',
      content: (
        <div className="space-y-4">
          {asinAnalytics.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">No ASIN inventory found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                ASIN inventory items will appear here when available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {asinAnalytics.map(item => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => handleProductClick(item.id, 'asin')}
                >
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
          )}
        </div>
      )
    },
    {
      value: 'sku',
      label: 'SKU Analytics',
      content: (
        <div className="space-y-4">
          {skuAnalytics.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">No SKU inventory found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                SKU inventory items will appear here when available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {skuAnalytics.map(item => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => handleProductClick(item.id, 'sku')}
                >
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
          )}
        </div>
      )
    },
    {
      value: 'details',
      label: 'Product Details',
      content: selectedItem ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedItem.identifier}</h3>
              <p className="text-sm text-muted-foreground">
                Added {formatDistanceToNow(new Date(selectedItem.date_added), { addSuffix: true })}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Back to Overview
            </Button>
          </div>

          {renderMetricsCards(selectedItem)}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Lifecycle Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderLifecycleTimeline(selectedItem.lifecycle_events)}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <History className="w-16 h-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No product selected</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Click on any product from the analytics tabs to view detailed lifecycle information
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <HuhaTab01 
        items={tabItems}
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
        tabsContentClassName="overflow-y-auto"
      />
    </div>
  );
}

interface VelocityItemsTableProps {
  items: any[];
  getUrgencyColor: (score: number) => "default" | "destructive" | "secondary" | "outline";
  showActions?: boolean;
  onProductClick?: (itemId: string, inventoryType: 'asin' | 'sku') => void;
}

function VelocityItemsTable({ items, getUrgencyColor, showActions = false, onProductClick }: VelocityItemsTableProps) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No items in this category</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Current Stock</TableHead>
          <TableHead>Velocity</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Recommended Order</TableHead>
          <TableHead>Stock Days</TableHead>
          <TableHead>Urgency</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow 
            key={item.item_id}
            className={onProductClick ? "cursor-pointer hover:bg-muted/50" : ""}
            onClick={() => onProductClick?.(item.item_id, item.table_name.includes('asin') ? 'asin' : 'sku')}
          >
            <TableCell className="font-medium">{item.identifier}</TableCell>
            <TableCell>{item.current_quantity}</TableCell>
            <TableCell>{item.sales_velocity.toFixed(3)}/day</TableCell>
            <TableCell>
              <Badge variant="outline">{item.velocity_category}</Badge>
            </TableCell>
            <TableCell className="font-bold text-green-600">
              {item.recommended_reorder_quantity}
            </TableCell>
            <TableCell>
              {item.stock_days_remaining ? `${item.stock_days_remaining.toFixed(1)} days` : 'N/A'}
            </TableCell>
            <TableCell>
              <Badge variant={getUrgencyColor(item.urgency_score)}>
                {item.urgency_score}
              </Badge>
            </TableCell>
            {showActions && (
              <TableCell>
                <Button size="sm" variant="outline">
                  Order {item.recommended_reorder_quantity}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}