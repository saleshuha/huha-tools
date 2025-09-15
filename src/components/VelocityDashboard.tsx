import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useVelocityAnalytics } from '@/hooks/useVelocityAnalytics';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Target, Zap, Activity } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export function VelocityDashboard() {
  const { velocityItems, velocityMetrics, loading, getUrgencyColor, getVelocityColor } = useVelocityAnalytics();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (loading) {
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

  return (
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Fast Moving Items</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <VelocityItemsTable items={getCategoryItems('Fast Moving')} getUrgencyColor={getUrgencyColor} />
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Medium Moving Items</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <VelocityItemsTable items={getCategoryItems('Medium Moving')} getUrgencyColor={getUrgencyColor} />
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Slow Moving Items</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <VelocityItemsTable items={getCategoryItems('Slow Moving')} getUrgencyColor={getUrgencyColor} />
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>No Sales Items</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              <VelocityItemsTable items={getCategoryItems('No Sales')} getUrgencyColor={getUrgencyColor} />
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
            <VelocityItemsTable items={velocityMetrics.criticalItems} getUrgencyColor={getUrgencyColor} showActions />
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
            <VelocityItemsTable items={velocityMetrics.topPerformers} getUrgencyColor={getUrgencyColor} />
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
  );
}

interface VelocityItemsTableProps {
  items: any[];
  getUrgencyColor: (score: number) => "default" | "destructive" | "secondary" | "outline";
  showActions?: boolean;
}

function VelocityItemsTable({ items, getUrgencyColor, showActions = false }: VelocityItemsTableProps) {
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
          <TableRow key={item.item_id}>
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