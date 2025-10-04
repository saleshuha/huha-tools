import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnifiedVelocityItem } from '@/hooks/useUnifiedVelocityAnalytics';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, TrendingDown, Minus, Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';

interface EnhancedVelocityTableProps {
  items: UnifiedVelocityItem[];
  loading: boolean;
  selectedItems: Set<string>;
  onSelectItem: (itemId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEditQuantity: (itemId: string, quantity: number, systemRecommendation: number) => void;
}

export function EnhancedVelocityTable({
  items,
  loading,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onEditQuantity
}: EnhancedVelocityTableProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'trending_up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'trending_down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUrgencyColor = (score: number): "default" | "destructive" | "secondary" => {
    if (score >= 90) return 'destructive';
    if (score >= 70) return 'secondary';
    return 'default';
  };

  const startEdit = (item: UnifiedVelocityItem) => {
    setEditingItem(item.item_id);
    setEditValue(item.recommended_reorder_quantity);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue(0);
  };

  const saveEdit = (item: UnifiedVelocityItem) => {
    onEditQuantity(item.item_id, editValue, item.recommended_reorder_quantity);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No items found matching your filters
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.size === items.length && items.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Velocity</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Days Left</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Recommended Qty</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.item_id}>
              <TableCell>
                <Checkbox
                  checked={selectedItems.has(item.item_id)}
                  onCheckedChange={() => onSelectItem(item.item_id)}
                />
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.sku || item.asin}</div>
                  <div className="text-sm text-muted-foreground truncate max-w-xs">
                    {item.title}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={
                  item.velocity_category === 'Fast Moving' ? 'default' :
                  item.velocity_category === 'Medium Moving' ? 'secondary' :
                  'outline'
                }>
                  {item.velocity_category}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.sales_velocity.toFixed(2)}/day
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getTrendIcon(item.velocity_trend)}
                  <span className="text-sm">
                    {item.velocity_30d > 0 && item.velocity_60d > 0
                      ? `${(((item.velocity_30d - item.velocity_60d) / item.velocity_60d) * 100).toFixed(0)}%`
                      : '-'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className={item.current_quantity === 0 ? 'text-red-500 font-medium' : ''}>
                  {item.current_quantity}
                </span>
              </TableCell>
              <TableCell>
                {item.days_until_stockout !== null ? (
                  <Badge variant={
                    item.days_until_stockout <= 7 ? 'destructive' :
                    item.days_until_stockout <= 14 ? 'secondary' :
                    'outline'
                  }>
                    {item.days_until_stockout}d
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Progress value={item.recommendation_confidence} className="h-2" />
                  <span className="text-xs text-muted-foreground">
                    {item.recommendation_confidence}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {editingItem === item.item_id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                      className="w-20"
                      min={0}
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveEdit(item)}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.recommended_reorder_quantity}</span>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {item.safety_stock > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Safety: {item.safety_stock}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={getUrgencyColor(item.urgency_score)}>
                  {item.urgency_score}
                </Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline">
                  Order
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
