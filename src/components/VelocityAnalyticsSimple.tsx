import { useState, useMemo } from "react";
import { useQuarterlyVelocityAnalytics, type VelocityAnalyticsItem } from "@/hooks/useQuarterlyVelocityAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, ShoppingCart, Filter, RotateCcw, Truck } from "lucide-react";
import { useProductImages } from "@/hooks/useProductImages";
import { useToast } from "@/hooks/use-toast";
import { VelocityItemCard } from "@/components/replenishment/VelocityItemCard";
import { ReplenishmentPagination } from "@/components/replenishment/ReplenishmentPagination";

export function VelocityAnalyticsSimple() {
  const {
    items,
    loading,
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
    toast({
      title: "Order to Source",
      description: `Ordering ${item.manual_override ?? item.recommended_quantity} units of ${item.asin}`,
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
    const totalQty = sortedFilteredItems
      .filter(item => selectedItems.has(item.asin_id))
      .reduce((sum, item) => sum + (item.manual_override ?? item.recommended_quantity), 0);
    
    toast({
      title: "Bulk Order to Source",
      description: `Ordering ${selectedCount} items (${totalQty} total units)`,
    });
    setSelectedItems(new Set());
    // TODO: Implement bulk ordering logic
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
          <Button onClick={handleSelectAllItems} variant="outline" className="gap-2">
            <Package className="w-4 h-4" />
            Select All Items
          </Button>
        </div>
      </div>

      {/* Tabs with integrated search */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between mb-4">
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
          
          <div className="flex gap-3 ml-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by ASIN, SKU, or Title..." 
                value={searchTerm} 
                onChange={e => handleSearchChange(e.target.value)} 
                className="pl-10 w-[300px]" 
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
        </div>

        <TabsContent value="ready" className="mt-6 space-y-4">
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
    </div>
  );
}
