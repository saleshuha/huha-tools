import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { UnifiedVelocityItem } from "@/hooks/useUnifiedVelocityAnalytics";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Edit, History } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EnhancedVelocityTableProps {
  items: UnifiedVelocityItem[];
  selectedItems: Set<string>;
  onSelectItem: (itemId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEditQuantity: (itemId: string, quantity: number) => void;
  loading: boolean;
}

export function EnhancedVelocityTable({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onEditQuantity,
  loading
}: EnhancedVelocityTableProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'trending_up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'trending_down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getVelocityBadge = (category: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      'Fast Moving': 'default',
      'Medium Moving': 'secondary',
      'Slow Moving': 'outline',
      'No Sales': 'destructive'
    };
    return <Badge variant={variants[category] || 'outline'}>{category}</Badge>;
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 90) return 'text-destructive';
    if (score >= 70) return 'text-warning';
    if (score >= 50) return 'text-primary';
    return 'text-muted-foreground';
  };

  const handleEdit = (item: UnifiedVelocityItem) => {
    setEditingItem(item.item_id);
    setEditValue(item.recommended_reorder_quantity);
  };

  const handleSaveEdit = (itemId: string) => {
    onEditQuantity(itemId, editValue);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Loading velocity analytics...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No items to display</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.size === items.length && items.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Velocity</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Days Until Stockout</TableHead>
            <TableHead>Recommended Qty</TableHead>
            <TableHead>Safety Stock</TableHead>
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
                  onCheckedChange={(checked) => onSelectItem(item.item_id, checked as boolean)}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{item.title || item.asin}</p>
                  <p className="text-sm text-muted-foreground">{item.sku || 'No SKU'}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{item.current_quantity}</p>
                  {item.stock_days_remaining && (
                    <p className="text-xs text-muted-foreground">
                      {item.stock_days_remaining.toFixed(0)} days
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {getVelocityBadge(item.velocity_category)}
                  <p className="text-xs text-muted-foreground">
                    {item.sales_velocity.toFixed(2)}/day
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getTrendIcon(item.velocity_trend)}
                  <span className="text-sm capitalize">{item.velocity_trend.replace('_', ' ')}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2 min-w-[120px]">
                  <Progress value={item.recommendation_confidence} className="h-2" />
                  <p className="text-xs text-center">{item.recommendation_confidence}%</p>
                </div>
              </TableCell>
              <TableCell>
                {item.days_until_stockout !== null ? (
                  <div className="flex items-center gap-2">
                    {item.days_until_stockout <= 7 && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={item.days_until_stockout <= 7 ? 'text-destructive font-bold' : ''}>
                      {item.days_until_stockout} days
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {editingItem === item.item_id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Button size="sm" onClick={() => handleSaveEdit(item.item_id)}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{item.recommended_reorder_quantity}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.safety_stock}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getUrgencyColor(item.urgency_score)}`}>
                    {item.urgency_score}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost">
                  <History className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
