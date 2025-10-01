import { useState, useMemo } from "react";
import { useQuarterlyVelocityAnalytics, type VelocityAnalyticsItem } from "@/hooks/useQuarterlyVelocityAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Search, Package, ShoppingCart, Filter, RotateCcw, Truck, Percent } from "lucide-react";
import { useProductImages } from "@/hooks/useProductImages";
import { useToast } from "@/hooks/use-toast";
import { VelocityItemCard } from "@/components/replenishment/VelocityItemCard";
import { ReplenishmentPagination } from "@/components/replenishment/ReplenishmentPagination";
import { SunskyOrderDialog } from "@/components/SunskyOrderDialog";
import { supabase } from "@/integrations/supabase/client";

export function VelocityAnalyticsSimple() {
  const {
    items,
    loading,
    loadAnalytics,
    saveManualOverride,
    clearManualOverride
  } = useQuarterlyVelocityAnalytics();
  const { toast } = useToast();
  const { getImageByAsin } = useProductImages();
  
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"ready" | "ordered">("ready");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState<"velocity" | "stock" | "recommended">("recommended");
  const [sunskyDialogOpen, setSunskyDialogOpen] = useState(false);
  const [sunskyOrderItems, setSunskyOrderItems] = useState<any[]>([]);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustmentPercentage, setAdjustmentPercentage] = useState("10");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustProgress, setAdjustProgress] = useState(0);
  
  // Memoized filtering and sorting
  const { readyToOrderItems, orderedItems, sortedFilteredItems } = useMemo(() => {
    // Apply search filter (local items already filtered at database level)
    const searchFiltered = items.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.asin.toLowerCase().includes(searchLower) || 
        (item.sku?.toLowerCase() || "").includes(searchLower) || 
        (item.title?.toLowerCase() || "").includes(searchLower)
      );
    });
    
    // Split into ready and ordered
    const ready = searchFiltered.filter(item => 
      item.manual_override === undefined || item.manual_override === null || item.manual_override > 0
    );
    
    const ordered = searchFiltered.filter(item => 
      item.manual_override === 0
    );
    
    // Get current tab items
    const currentItems = activeTab === "ready" ? ready : ordered;
    
    // Sort items
    const sorted = [...currentItems].sort((a, b) => {
      switch (sortBy) {
        case "velocity":
          return (b.velocity_score || 0) - (a.velocity_score || 0);
        case "stock":
          return a.current_quantity - b.current_quantity;
        case "recommended":
          return (b.manual_override ?? b.recommended_quantity) - (a.manual_override ?? a.recommended_quantity);
        default:
          return 0;
      }
    });
    
    return {
      readyToOrderItems: ready,
      orderedItems: ordered,
      sortedFilteredItems: sorted
    };
  }, [items, searchTerm, activeTab, sortBy]);
  
  // Pagination
  const totalPages = Math.ceil(sortedFilteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedFilteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedFilteredItems, currentPage, itemsPerPage]);
  
  // Reset to page 1 when tab or search changes (keep selections)
  const handleTabChange = (value: string) => {
    setActiveTab(value as "ready" | "ordered");
    setCurrentPage(1);
    // Don't reset selections when changing tabs
  };
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    // Don't reset selections when searching
  };
  
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

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
    const newSelected = new Set(selectedItems);
    if (checked) {
      // Add all items on current page to selection
      paginatedItems.forEach(item => newSelected.add(item.asin_id));
    } else {
      // Remove all items on current page from selection
      paginatedItems.forEach(item => newSelected.delete(item.asin_id));
    }
    setSelectedItems(newSelected);
  };

  const handleOrderToSource = (item: VelocityAnalyticsItem) => {
    // Check if item has SKU (required for Sunsky)
    if (!item.sku || item.sku.trim() === '') {
      toast({
        title: "Missing SKU",
        description: "This item doesn't have a SKU. Only items with SKUs can be ordered from Sunsky.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare order item for Sunsky dialog
    const orderItem = {
      id: item.asin_id,
      po_number: `VELOCITY-${Date.now()}`,
      sku_code: item.sku,
      asin: item.asin,
      quantity: item.manual_override ?? item.recommended_quantity,
      status: 'pending',
      model_number: item.sku,
      title: item.title || `Velocity restock for ${item.asin}`,
      notes: `Velocity-based replenishment - Velocity Score: ${item.velocity_score || 0}, Recommended: ${item.manual_override ?? item.recommended_quantity}`,
      sunsky_sku: item.sku,
      itemNo: item.sku,
      qty: item.manual_override ?? item.recommended_quantity
    };
    
    setSunskyOrderItems([orderItem]);
    setSunskyDialogOpen(true);
  };

  const handleBulkOrderToSource = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to order",
        variant: "destructive",
      });
      return;
    }
    
    // Get selected items with their details
    const itemsToOrder = sortedFilteredItems.filter(item => selectedItems.has(item.asin_id));
    
    // Check if all items have SKUs (required for Sunsky)
    const itemsWithoutSku = itemsToOrder.filter(item => !item.sku || item.sku.trim() === '');
    
    if (itemsWithoutSku.length > 0) {
      toast({
        title: "Missing SKUs",
        description: `${itemsWithoutSku.length} items don't have SKUs. Only items with SKUs can be ordered from Sunsky.`,
        variant: "destructive",
      });
      return;
    }
    
    // Prepare order items for Sunsky dialog
    const orderItems = itemsToOrder.map(item => ({
      id: item.asin_id,
      po_number: `VELOCITY-${Date.now()}`,
      sku_code: item.sku,
      asin: item.asin,
      quantity: item.manual_override ?? item.recommended_quantity,
      status: 'pending',
      model_number: item.sku,
      title: item.title || `Velocity restock for ${item.asin}`,
      notes: `Velocity-based replenishment - Velocity Score: ${item.velocity_score || 0}, Recommended: ${item.manual_override ?? item.recommended_quantity}`,
      sunsky_sku: item.sku,
      itemNo: item.sku,
      qty: item.manual_override ?? item.recommended_quantity
    }));
    
    setSunskyOrderItems(orderItems);
    setSunskyDialogOpen(true);
  };

  const handleSunskyOrderSuccess = async (orderNumber: string, selectedOrderIds: string[]) => {
    try {
      // Mark the selected inventory items as ordered
      const updatePromises = Array.from(selectedItems).map(async itemId => {
        return supabase
          .from('asin_inventory')
          .update({ status: 'ordered' })
          .eq('id', itemId);
      });
      
      await Promise.all(updatePromises);
      
      toast({
        title: "Sunsky Order Placed Successfully",
        description: `Order ${orderNumber} has been placed. ${selectedItems.size} items marked as ordered.`,
      });
      
      setSelectedItems(new Set());
      setSunskyDialogOpen(false);
      
      // Reload analytics data
      loadAnalytics();
    } catch (error) {
      console.error('Error updating items after Sunsky order:', error);
      toast({
        title: "Order Placed but Update Failed",
        description: `Order ${orderNumber} was placed successfully, but failed to update item status.`,
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (item: VelocityAnalyticsItem) => {
    setEditingId(item.asin_id);
    setEditValue(String(item.manual_override ?? item.recommended_quantity));
  };
  
  const handleSaveEdit = async (item: VelocityAnalyticsItem) => {
    const quantity = parseInt(editValue);
    if (!isNaN(quantity) && quantity >= 0) {
      await saveManualOverride(item.asin_id, quantity, item.recommended_quantity);
      toast({
        title: "Quantity updated",
        description: `Recommended quantity set to ${quantity}`,
      });
    }
    setEditingId(null);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };
  
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const allSelected = paginatedItems.length > 0 && 
    paginatedItems.every(item => selectedItems.has(item.asin_id));

  const handleSelectAllItems = () => {
    const newSelected = new Set<string>();
    sortedFilteredItems.forEach(item => newSelected.add(item.asin_id));
    setSelectedItems(newSelected);
    toast({
      title: "All items selected",
      description: `Selected ${sortedFilteredItems.length} items to order`,
    });
  };

  const handleAdjustQuantities = async () => {
    const percentage = parseFloat(adjustmentPercentage);
    
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: "Invalid Percentage",
        description: "Please enter a percentage between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setIsAdjusting(true);
    setAdjustProgress(0);
    
    try {
      const reductionMultiplier = 1 - (percentage / 100);
      const itemsToUpdate = readyToOrderItems.filter(item => {
        const currentQty = item.manual_override ?? item.recommended_quantity;
        const newQty = Math.max(1, Math.round(currentQty * reductionMultiplier));
        return newQty !== currentQty;
      });

      if (itemsToUpdate.length === 0) {
        toast({
          title: "No Changes",
          description: "No quantities need to be updated",
        });
        setAdjustDialogOpen(false);
        setIsAdjusting(false);
        return;
      }

      let processedCount = 0;

      // Process items sequentially to update progress
      for (const item of itemsToUpdate) {
        const currentQty = item.manual_override ?? item.recommended_quantity;
        const newQty = Math.max(1, Math.round(currentQty * reductionMultiplier));
        
        await saveManualOverride(item.asin_id, newQty, item.recommended_quantity);
        
        processedCount++;
        setAdjustProgress((processedCount / itemsToUpdate.length) * 100);
      }

      await loadAnalytics();

      toast({
        title: "Quantities Adjusted",
        description: `Reduced ${itemsToUpdate.length} items by ${percentage}%`,
      });

      setAdjustDialogOpen(false);
      setAdjustmentPercentage("10");
      setAdjustProgress(0);
    } catch (error) {
      console.error('Error adjusting quantities:', error);
      toast({
        title: "Error",
        description: "Failed to adjust quantities",
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Velocity Analytics</h2>
          <p className="text-muted-foreground">Items eligible for restock based on sales velocity</p>
        </div>
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <Button onClick={handleBulkOrderToSource} className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Order {selectedItems.size} Items
            </Button>
          )}
          <Button 
            onClick={() => setAdjustDialogOpen(true)} 
            variant="outline" 
            className="gap-2"
            disabled={readyToOrderItems.length === 0}
          >
            <Percent className="w-4 h-4" />
            Adjust Quantities
          </Button>
          <Button onClick={handleSelectAllItems} variant="outline" className="gap-2">
            <Package className="w-4 h-4" />
            Select All Items
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-14 p-2 bg-gradient-subtle rounded-xl shadow-elegant">
          <TabsTrigger value="ready" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Ready to Order ({readyToOrderItems.length})
          </TabsTrigger>
          <TabsTrigger value="ordered" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Ordered ({orderedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready" className="mt-6 space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by ASIN, SKU, or Title..." 
                value={searchTerm} 
                onChange={e => handleSearchChange(e.target.value)} 
                className="pl-10" 
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Sort by Recommended</SelectItem>
                <SelectItem value="velocity">Sort by Velocity</SelectItem>
                <SelectItem value="stock">Sort by Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select All Header */}
          {paginatedItems.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all on this page
              </span>
            </div>
          )}

          {/* Items Grid */}
          <div className="space-y-3">
            {paginatedItems.map(item => (
              <VelocityItemCard
                key={item.asin_id}
                item={item}
                imageUrl={getImageByAsin(item.asin)?.image_url}
                selected={selectedItems.has(item.asin_id)}
                onSelect={handleSelectItem}
                isEditing={editingId === item.asin_id}
                editValue={editValue}
                onEditClick={() => handleEditClick(item)}
                onSaveEdit={() => handleSaveEdit(item)}
                onCancelEdit={handleCancelEdit}
                onEditValueChange={setEditValue}
                onClearOverride={() => clearManualOverride(item.asin_id)}
                onOrderToSource={() => handleOrderToSource(item)}
              />
            ))}
          </div>

          {paginatedItems.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No items found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <ReplenishmentPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedFilteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </TabsContent>

        <TabsContent value="ordered" className="mt-6 space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by ASIN, SKU, or Title..." 
                value={searchTerm} 
                onChange={e => handleSearchChange(e.target.value)} 
                className="pl-10" 
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Sort by Recommended</SelectItem>
                <SelectItem value="velocity">Sort by Velocity</SelectItem>
                <SelectItem value="stock">Sort by Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select All Header */}
          {paginatedItems.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all on this page
              </span>
            </div>
          )}

          {/* Items Grid */}
          <div className="space-y-3">
            {paginatedItems.map(item => (
              <Card key={item.asin_id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  <div className="flex items-start pt-1">
                    <Checkbox
                      checked={selectedItems.has(item.asin_id)}
                      onCheckedChange={(checked) => handleSelectItem(item.asin_id, checked as boolean)}
                    />
                  </div>
                  
                  {/* Image */}
                  <div className="flex-shrink-0">
                    {getImageByAsin(item.asin)?.image_url ? (
                      <img 
                        src={getImageByAsin(item.asin)?.image_url} 
                        alt={item.asin}
                        className="w-20 h-20 object-contain rounded-md border border-border bg-white p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="none"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Cpath d="M40 38a4 4 0 100-8 4 4 0 000 8zM28 48l8-8 8 8 12-12v20H28V48z" fill="%239ca3af"/%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center border border-border">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm font-mono mb-1">{item.asin}</h4>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-1">
                          {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
                        </div>
                        {item.title && (
                          <p className="text-xs text-muted-foreground line-clamp-2" title={item.title}>
                            {item.title}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-muted-foreground">
                      <div>Added: <strong className="text-foreground">{item.total_added}</strong></div>
                      <div>Sold: <strong className="text-foreground">{item.total_sold}</strong></div>
                      <div>Stock: <strong className="text-foreground">{item.current_quantity}</strong></div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Was recommended: <strong className="text-foreground">{item.recommended_quantity}</strong>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          clearManualOverride(item.asin_id);
                          toast({
                            title: "Item restored",
                            description: "Item moved back to ready to order",
                          });
                        }}
                        className="gap-1 h-7 text-xs ml-auto"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {paginatedItems.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No ordered items</p>
                <p className="text-sm">Items marked as ordered will appear here</p>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <ReplenishmentPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedFilteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Sunsky Order Dialog */}
      <SunskyOrderDialog
        open={sunskyDialogOpen}
        onOpenChange={setSunskyDialogOpen}
        selectedOrders={sunskyOrderItems}
        onOrderSuccess={handleSunskyOrderSuccess}
      />

      {/* Adjust Quantities Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Recommended Quantities</DialogTitle>
            <DialogDescription>
              Reduce all recommended quantities by a percentage. This will apply to all {readyToOrderItems.length} items in the "Ready to Order" tab.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!isAdjusting ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="percentage">Reduction Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={adjustmentPercentage}
                      onChange={(e) => setAdjustmentPercentage(e.target.value)}
                      placeholder="Enter percentage"
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a value between 0-100 to reduce quantities
                  </p>
                </div>

                {/* Preview */}
                {adjustmentPercentage && parseFloat(adjustmentPercentage) > 0 && parseFloat(adjustmentPercentage) <= 100 && (
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>• Original quantity: 100 → New quantity: {Math.max(1, Math.round(100 * (1 - parseFloat(adjustmentPercentage) / 100)))}</p>
                      <p>• Original quantity: 50 → New quantity: {Math.max(1, Math.round(50 * (1 - parseFloat(adjustmentPercentage) / 100)))}</p>
                      <p>• Original quantity: 10 → New quantity: {Math.max(1, Math.round(10 * (1 - parseFloat(adjustmentPercentage) / 100)))}</p>
                      <p className="text-xs text-orange-600 mt-2">Note: Minimum quantity will be set to 1</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Adjusting quantities...</span>
                  <span className="font-medium">{Math.round(adjustProgress)}%</span>
                </div>
                <Progress value={adjustProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Please wait while we update all items
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAdjustDialogOpen(false)}
              disabled={isAdjusting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAdjustQuantities}
              disabled={isAdjusting || !adjustmentPercentage}
            >
              {isAdjusting ? "Adjusting..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
