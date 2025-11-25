import { useState, useMemo } from "react";
import { useDailySalesOrders, type DailySoldItem } from "@/hooks/useDailySalesOrders";
import { useCountry } from "@/contexts/CountryContext";
import { DailyOrderWarningBanner } from "./DailyOrderWarningBanner";
import { DailyOrderMetricCards } from "./DailyOrderMetricCards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductImages } from "@/hooks/useProductImages";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, X, Package, Calendar } from "lucide-react";
import { SunskyOrderDialog } from "@/components/SunskyOrderDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function DailySalesOrderQueue() {
  const {
    todaysSales,
    previousDaysPending,
    metrics,
    loading,
    loadTodaysSales,
    markAsOrdered,
    skipItem
  } = useDailySalesOrders();
  const { getImageByAsin } = useProductImages();
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sunskyDialogOpen, setSunskyDialogOpen] = useState(false);
  const [sunskyOrderItems, setSunskyOrderItems] = useState<any[]>([]);
  const [showPreviousDays, setShowPreviousDays] = useState(false);

  // Filter to show only pending items
  const pendingItems = useMemo(() => 
    todaysSales.filter(item => item.order_status === 'pending'),
    [todaysSales]
  );

  const handleSelectItem = (inventoryId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(inventoryId);
    } else {
      newSelected.delete(inventoryId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(pendingItems.map(item => item.inventory_id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleOrderSingle = (item: DailySoldItem) => {
    if (!item.sku) {
      toast({
        title: "Missing SKU",
        description: "This item doesn't have a SKU. Cannot order to Sunsky.",
        variant: "destructive",
      });
      return;
    }

    const velocityOrderId = `DAILY-${Date.now()}`;
    const orderItem = {
      id: item.inventory_id,
      po_number: velocityOrderId,
      site_number: velocityOrderId,
      sku_code: item.sku,
      asin: item.asin,
      quantity: item.recommended_quantity,
      status: 'pending',
      model_number: item.sku,
      title: item.title || `Daily restock for ${item.asin}`,
      notes: `Daily sales order - Sold: ${item.sold_today}, Stock: ${item.remaining_stock}`,
      sunsky_sku: item.sku,
      itemNo: item.sku,
      qty: item.recommended_quantity
    };

    setSunskyOrderItems([orderItem]);
    setSunskyDialogOpen(true);
  };

  const handleBulkOrder = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to order",
        variant: "destructive",
      });
      return;
    }

    const itemsToOrder = pendingItems.filter(item => selectedItems.has(item.inventory_id));
    const itemsWithoutSku = itemsToOrder.filter(item => !item.sku);

    if (itemsWithoutSku.length > 0) {
      toast({
        title: "Missing SKUs",
        description: `${itemsWithoutSku.length} items don't have SKUs. Cannot order to Sunsky.`,
        variant: "destructive",
      });
      return;
    }

    const velocityOrderId = `DAILY-${Date.now()}`;
    const orderItems = itemsToOrder.map(item => ({
      id: item.inventory_id,
      po_number: velocityOrderId,
      site_number: velocityOrderId,
      sku_code: item.sku!,
      asin: item.asin,
      quantity: item.recommended_quantity,
      status: 'pending',
      model_number: item.sku,
      title: item.title || `Daily restock for ${item.asin}`,
      notes: `Daily sales order - Sold: ${item.sold_today}, Stock: ${item.remaining_stock}`,
      sunsky_sku: item.sku,
      itemNo: item.sku,
      qty: item.recommended_quantity
    }));

    setSunskyOrderItems(orderItems);
    setSunskyDialogOpen(true);
  };

  const handleSunskyOrderSuccess = async (orderNumber: string) => {
    // Mark all ordered items
    for (const item of sunskyOrderItems) {
      await markAsOrdered(item.id, orderNumber);
    }

    setSelectedItems(new Set());
    setSunskyDialogOpen(false);
    
    toast({
      title: "Success",
      description: `Order ${orderNumber} placed. ${sunskyOrderItems.length} items marked as ordered.`,
    });
  };

  const handleSkipItem = async (inventoryId: string) => {
    await skipItem(inventoryId, "Manual skip from daily queue");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const allSelected = pendingItems.length > 0 && 
    pendingItems.every(item => selectedItems.has(item.inventory_id));

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <DailyOrderWarningBanner 
        pendingCount={metrics.pendingFromPreviousDays}
        onViewPending={() => setShowPreviousDays(!showPreviousDays)}
      />

      {/* Metrics */}
      <DailyOrderMetricCards metrics={metrics} />

      {/* Today's Sold Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Today's Sold Items (Stock &gt; 0, Eligible for Restock)
              </CardTitle>
              <CardDescription className="mt-2">
                Items that sold today and need to be reordered from supplier
              </CardDescription>
            </div>
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedItems.size} selected</Badge>
                <Button onClick={handleBulkOrder} size="sm">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Order Selected to Sunsky
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-4">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>
                <p className="text-base font-medium">No items found for today</p>
                <p className="text-sm mt-2">
                  {todaysSales.length === 0 
                    ? "No sales recorded today with available stock"
                    : "All sold items have been ordered or skipped"
                  }
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto text-left space-y-2">
                <p className="text-xs font-semibold text-foreground/70">Items appear here when they meet ALL criteria:</p>
                <ul className="text-xs space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Sold today ({new Date().toLocaleDateString()})</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Current stock {">"} 0 units</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Eligible for restock (auto-reorder enabled)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Country: <Badge variant="outline" className="ml-1 font-mono text-xs">{selectedCountry.toUpperCase()}</Badge></span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                  💡 Try switching country filter or check if items have stock available
                </p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-16">Image</TableHead>
                    <TableHead>ASIN</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-center">Sold</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Recommended</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((item) => {
                    const image = getImageByAsin(item.asin);
                    return (
                      <TableRow key={item.inventory_id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.inventory_id)}
                            onCheckedChange={(checked) => 
                              handleSelectItem(item.inventory_id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {image?.image_url ? (
                            <img 
                              src={image.image_url} 
                              alt={item.asin}
                              className="w-10 h-10 object-contain rounded border"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.asin}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.sku || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.title || <span className="text-muted-foreground">No title</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">-{item.sold_today}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{item.remaining_stock}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge>{item.recommended_quantity}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleOrderSingle(item)}
                            >
                              Order
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSkipItem(item.inventory_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Days Pending */}
      {previousDaysPending.length > 0 && (
        <Collapsible open={showPreviousDays} onOpenChange={setShowPreviousDays}>
          <Card className="border-destructive/50">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-destructive" />
                    Previous Days Pending ({metrics.pendingFromPreviousDays} items)
                  </CardTitle>
                  <Badge variant="destructive">Action Required</Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {previousDaysPending.map((day) => (
                    <div key={day.date} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{day.date}</h4>
                        <Badge variant="outline">{day.count} items</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {day.items.map(item => item.asin).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Sunsky Order Dialog */}
      <SunskyOrderDialog
        open={sunskyDialogOpen}
        onOpenChange={setSunskyDialogOpen}
        selectedOrders={sunskyOrderItems}
        onOrderSuccess={handleSunskyOrderSuccess}
      />
    </div>
  );
}
