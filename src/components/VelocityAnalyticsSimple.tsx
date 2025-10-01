import { useState } from "react";
import { useQuarterlyVelocityAnalytics, type VelocityAnalyticsItem } from "@/hooks/useQuarterlyVelocityAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, Edit2, Check, X, RotateCcw, ShoppingCart, Eye } from "lucide-react";
import { useProductImages } from "@/hooks/useProductImages";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
export function VelocityAnalyticsSimple() {
  const {
    items,
    loading,
    saveManualOverride,
    clearManualOverride
  } = useQuarterlyVelocityAnalytics();
  const { toast } = useToast();
  const { getImageByAsin } = useProductImages();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<VelocityAnalyticsItem | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const filteredItems = items.filter(item => 
    item.asin.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectItem = (asinId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(asinId);
    } else {
      newSelected.delete(asinId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map(item => item.asin_id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleOrderToSource = (item: VelocityAnalyticsItem) => {
    toast({
      title: "Order to Source",
      description: `Ordering ${item.manual_override || item.recommended_quantity} units of ${item.asin}`,
    });
    // TODO: Implement actual ordering logic
  };

  const handleBulkOrderToSource = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to order",
        variant: "destructive",
      });
      return;
    }
    
    const selectedCount = selectedItems.size;
    const totalQty = filteredItems
      .filter(item => selectedItems.has(item.asin_id))
      .reduce((sum, item) => sum + (item.manual_override || item.recommended_quantity), 0);
    
    toast({
      title: "Bulk Order to Source",
      description: `Ordering ${selectedCount} items (${totalQty} total units)`,
    });
    // TODO: Implement bulk ordering logic
  };

  const handlePreview = (item: VelocityAnalyticsItem) => {
    setPreviewItem(item);
    setPreviewDialogOpen(true);
  };
  const handleEditClick = (item: VelocityAnalyticsItem) => {
    setEditingId(item.asin_id);
    setEditValue(String(item.manual_override || item.recommended_quantity));
  };
  const handleSaveEdit = async (item: VelocityAnalyticsItem) => {
    const quantity = parseInt(editValue);
    if (!isNaN(quantity) && quantity >= 0) {
      await saveManualOverride(item.asin_id, quantity, item.recommended_quantity);
    }
    setEditingId(null);
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };
  if (loading) {
    return <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>;
  }

  const allSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.length;

  return <div className="space-y-6 p-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Velocity Analytics</CardTitle>
              <CardDescription>
                Track inventory movement and get intelligent ordering recommendations
              </CardDescription>
            </div>
            {selectedItems.size > 0 && (
              <Button onClick={handleBulkOrderToSource} className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Order {selectedItems.size} Items
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by ASIN, SKU, or Title..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Product Details</TableHead>
                <TableHead className="text-center">Total Added</TableHead>
                <TableHead className="text-center">Total Sold</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Velocity</TableHead>
                <TableHead className="text-center">Recommended Qty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(item => {
                const isEditing = editingId === item.asin_id;
                const displayQty = item.manual_override || item.recommended_quantity;
                const hasOverride = item.manual_override !== undefined;
                const imageUrl = getImageByAsin(item.asin)?.image_url;
                const isSelected = selectedItems.has(item.asin_id);

                return (
                  <TableRow key={item.asin_id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.asin_id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={item.asin}
                          className="w-16 h-16 object-contain rounded-md border border-border bg-white p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none"%3E%3Crect width="64" height="64" fill="%23f3f4f6"/%3E%3Cpath d="M32 30a3 3 0 100-6 3 3 0 000 6zM22 38l6-6 6 6 10-10v16H22V38z" fill="%239ca3af"/%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center border border-border">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[200px]">
                        <div className="font-mono font-medium text-sm">{item.asin}</div>
                        <div className="text-xs text-muted-foreground font-mono">SKU: {item.sku || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground max-w-xs truncate" title={item.title}>
                          {item.title || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.total_added}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.total_sold}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.current_quantity === 0 ? "destructive" : "default"}>
                        {item.current_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {(item.velocity_score || 0).toFixed(2)}/day
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <Input 
                            type="number" 
                            value={editValue} 
                            onChange={e => setEditValue(e.target.value)} 
                            className="w-20 h-8 text-center" 
                            min="0" 
                            autoFocus 
                          />
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            onClick={() => handleSaveEdit(item)}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`font-medium ${hasOverride ? 'text-blue-600' : ''}`}>
                              {displayQty}
                            </span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0" 
                              onClick={() => handleEditClick(item)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {hasOverride && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0" 
                                onClick={() => clearManualOverride(item.asin_id)} 
                                title="Reset to system recommendation"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          {hasOverride && (
                            <div className="text-xs text-muted-foreground">
                              System: {item.recommended_quantity}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(item)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOrderToSource(item)}
                          className="gap-2"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Order
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Preview</DialogTitle>
            <DialogDescription>
              Detailed view of velocity analytics for this item
            </DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  {getImageByAsin(previewItem.asin)?.image_url ? (
                    <img 
                      src={getImageByAsin(previewItem.asin)?.image_url} 
                      alt={previewItem.asin}
                      className="w-32 h-32 object-contain rounded-md border border-border bg-white p-2"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center border border-border">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">ASIN</div>
                    <div className="font-mono font-medium">{previewItem.asin}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">SKU</div>
                    <div className="font-mono">{previewItem.sku || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Title</div>
                    <div className="text-sm">{previewItem.title || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Added</div>
                  <div className="text-2xl font-bold">{previewItem.total_added}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Sold</div>
                  <div className="text-2xl font-bold">{previewItem.total_sold}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Current Stock</div>
                  <Badge variant={previewItem.current_quantity === 0 ? "destructive" : "default"} className="text-lg px-3 py-1">
                    {previewItem.current_quantity}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Velocity Score</div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {(previewItem.velocity_score || 0).toFixed(2)}/day
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Recommended Order Quantity</div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-primary">
                    {previewItem.manual_override || previewItem.recommended_quantity}
                  </div>
                  {previewItem.manual_override !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      (System: {previewItem.recommended_quantity})
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">First Added</div>
                <div>{format(new Date(previewItem.first_added_date), 'MMMM dd, yyyy')}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            {previewItem && (
              <Button onClick={() => {
                handleOrderToSource(previewItem);
                setPreviewDialogOpen(false);
              }} className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Order to Source
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}