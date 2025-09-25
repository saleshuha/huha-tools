import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useLabelPrintSettings } from '@/hooks/usePrintSettings';
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar as CalendarIcon, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star, Edit3, Activity, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DualQuantityEditor } from './DualQuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';
import { SkuEditor } from './SkuEditor';
import { SerialNumberEditor } from './SerialNumberEditor';
import { TitleEditor } from './TitleEditor';
import { InventoryMetrics } from './InventoryMetrics';
import { InventoryDashboard } from './InventoryDashboard';
import { BulkSkuUpload } from './BulkSkuUpload';
import { BulkTitleUpload } from './BulkTitleUpload';
import { SimpleWarehouseManager } from './SimpleWarehouseManager';

import { useWarehouseManager } from '@/hooks/useWarehouseManager';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { useCountry } from '@/contexts/CountryContext';
import { useProductImages } from '@/hooks/useProductImages';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { PrintService } from '@/services/print-service';
import { LabelDoc, LabelDataset, LabelElement, PrintSettings } from '@/types/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function AsinInventory() {
  const {
    inventory,
    loading,
    addItem,
    updateItemStatus,
    bulkAdd,
    restockItem,
    updateQuantity,
    updateSku,
    updateSerialNumber,
    updateTitle,
    bulkUpdateSkus,
    bulkUpdateTitles,
    fetchTitlesFromSunsky,
    updateRestockEligibility,
    calculateAutoRestockEligibility,
    refetch
  } = useAsinInventory();
  const { user } = useUserProfile();
  const { runTitleFetch } = useBackgroundTasks();
  const { getImageByAsin, isLoading: imagesLoading, productImages, refreshImages } = useProductImages();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMethod, setSearchMethod] = useState<'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'asin' | 'quantity' | 'status' | 'title' | 'serialNumber'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Export mode settings - global (use stock qty) or local (use default 100)
  const [exportModes, setExportModes] = useState<Record<string, 'global' | 'local'>>({});
  
  // Modern printing state
  const [qzConnected, setQzConnected] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [isBulkQuantityDialogOpen, setIsBulkQuantityDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<AsinInventoryItem['status']>('in-stock');
  const [bulkQuantityValue, setBulkQuantityValue] = useState(1);
  const [bulkQuantityReason, setBulkQuantityReason] = useState('');
  const [isBulkRestockEligibilityDialogOpen, setIsBulkRestockEligibilityDialogOpen] = useState(false);
  const [bulkRestockEligibilityValue, setBulkRestockEligibilityValue] = useState(true);
  const [isProcessingRestockEligibility, setIsProcessingRestockEligibility] = useState(false);
  const [restockEligibilityProgress, setRestockEligibilityProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [quickFilter, setQuickFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'recent'>('all');
  const [dateFilterFrom, setDateFilterFrom] = useState<Date>();
  const [dateFilterTo, setDateFilterTo] = useState<Date>();
  
  // Image preview states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);

  // Image preview handlers
  const handleImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setIsPreviewDialogOpen(true);
  };

  // Component for displaying product images
  const ProductImage = ({ asin }: { asin: string }) => {
    const productImage = getImageByAsin(asin);
    
    if (imagesLoading) {
      return (
        <div className="w-20 h-20 min-w-[5rem] min-h-[5rem] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border flex-shrink-0 animate-pulse">
          <div className="w-4 h-4 bg-muted-foreground/50 rounded animate-spin border-2 border-transparent border-t-muted-foreground/50"></div>
        </div>
      );
    }
    
    if (!productImage) {
      return (
        <div className="w-20 h-20 min-w-[5rem] min-h-[5rem] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border flex-shrink-0">
          <Eye className="w-6 h-6 text-muted-foreground" />
        </div>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-20 h-20 min-w-[5rem] min-h-[5rem] rounded-lg overflow-hidden border-2 border-border cursor-pointer hover:border-primary transition-colors flex-shrink-0">
            <img 
              src={productImage.image_url} 
              alt={`Product image for ${asin}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-muted flex items-center justify-center"><Eye class="w-6 h-6 text-muted-foreground" /></div>';
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-80 p-2">
          <div className="w-full h-64 rounded-lg overflow-hidden bg-white">
            <img 
              src={productImage.image_url} 
              alt={`Product preview for ${asin}`}
              className="w-full h-full object-contain"
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  
  // Use warehouse management from hook
  const { selectedWarehouse } = useWarehouseManager();
  const { toast } = useToast();
  const { printSettings, setPrintSettings, getPrintSettings } = useLabelPrintSettings();
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    sku: string;
    title: string;
    status: AsinInventoryItem['status'];
    quantity: number;
    notes: string;
  }>({
    asin: '',
    serialNumber: '',
    sku: '',
    title: '',
    status: 'in-stock',
    quantity: 1,
    notes: ''
  });
  const [bulkText, setBulkText] = useState('');

  const filteredInventory = useMemo(() => {
    if (loading) {
      return [];
    }

    let filtered = inventory;

    // Remove duplicates first - keep the most recent record for each ASIN+SKU+Serial combination
    const uniqueMap = new Map();
    filtered.forEach(item => {
      const key = `${item.asin}-${item.sku || ''}-${item.serialNumber || ''}`;
      const existing = uniqueMap.get(key);
      if (!existing || new Date(item.dateAdded) > new Date(existing.dateAdded)) {
        uniqueMap.set(key, item);
      }
    });
    filtered = Array.from(uniqueMap.values());

    // Apply search filter
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      
      filtered = filtered.filter(item => {
        if (searchMethod === 'all') {
          return searchTerms.some(term => {
            const termLower = term.toLowerCase().trim();
            const asinMatch = item.asin.toLowerCase().includes(termLower);
            const serialMatch = item.serialNumber && item.serialNumber.toLowerCase().includes(termLower);
            const skuMatch = item.sku && item.sku.toLowerCase().includes(termLower);
            const titleMatch = item.title && item.title.toLowerCase().includes(termLower);
            const notesMatch = item.notes && item.notes.toLowerCase().includes(termLower);
            
            return asinMatch || serialMatch || skuMatch || titleMatch || notesMatch;
          });
        } else if (searchMethod === 'asin') {
          return searchTerms.some(term => item.asin.toLowerCase().includes(term.toLowerCase().trim()));
        } else if (searchMethod === 'sku') {
          return item.sku && searchTerms.some(term => item.sku.toLowerCase().includes(term.toLowerCase().trim()));
        } else if (searchMethod === 'serial') {
          return searchTerms.some(term => {
            return item.serialNumber && item.serialNumber.toLowerCase().includes(term.toLowerCase().trim());
          });
        } else if (searchMethod === 'title') {
          return item.title && searchTerms.some(term => item.title.toLowerCase().includes(term.toLowerCase().trim()));
        } else if (searchMethod === 'notes') {
          return item.notes && searchTerms.some(term => item.notes.toLowerCase().includes(term.toLowerCase().trim()));
        }
        return false;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const effectiveStatus = item.status === 'ordered' ? 'sold' : item.status;
        return effectiveStatus === statusFilter;
      });
    }

    // Apply quick filter
    if (quickFilter === 'low-stock') {
      filtered = filtered.filter(item => item.quantity > 0 && item.quantity <= 5);
    } else if (quickFilter === 'out-of-stock') {
      filtered = filtered.filter(item => item.quantity === 0);

      // Apply date filter for out-of-stock items
      if (dateFilterFrom || dateFilterTo) {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.dateAdded);
          const fromDate = dateFilterFrom ? new Date(dateFilterFrom.setHours(0, 0, 0, 0)) : null;
          const toDate = dateFilterTo ? new Date(dateFilterTo.setHours(23, 59, 59, 999)) : null;
          if (fromDate && toDate) {
            return itemDate >= fromDate && itemDate <= toDate;
          } else if (fromDate) {
            return itemDate >= fromDate;
          } else if (toDate) {
            return itemDate <= toDate;
          }
          return true;
        });
      }
    } else if (quickFilter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(item => new Date(item.dateAdded) >= sevenDaysAgo);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      if (sortBy === 'dateAdded') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortBy === 'title') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      } else if (sortBy === 'serialNumber') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (sortBy === 'asin') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [inventory, searchTerm, searchMethod, statusFilter, sortBy, sortOrder, quickFilter, dateFilterFrom, dateFilterTo, loading]);

  const handleAddItem = async () => {
    if (!newItem.asin.trim()) {
      toast({ title: "Error", description: "ASIN is required", variant: "destructive" });
      return;
    }

    try {
      await addItem({
        ...newItem,
        asin: newItem.asin.trim().toUpperCase(),
        serialNumber: newItem.serialNumber.trim(),
        sku: newItem.sku.trim(),
        title: newItem.title.trim(),
        notes: newItem.notes.trim(),
        dateAdded: new Date().toISOString()
      });
      
      setNewItem({
        asin: '',
        serialNumber: '',
        sku: '',
        title: '',
        status: 'in-stock',
        quantity: 1,
        notes: ''
      });
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Item added successfully" });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      toast({ title: "Error", description: "Please enter some data", variant: "destructive" });
      return;
    }

    try {
      const lines = bulkText.trim().split('\n').filter(line => line.trim());
      const items = lines.map(line => {
        const parts = line.split('\t').map(part => part?.trim() || '');
        const [asin, serialNumber = '', sku = '', status = 'in-stock', quantity = '1', notes = ''] = parts;
        
        const parsedQuantity = parseInt(quantity) || 1;
        let finalStatus = status as AsinInventoryItem['status'];
        
        if (parsedQuantity === 0) {
          finalStatus = 'sold';
        }
        
        return {
          asin: asin.toUpperCase(),
          serialNumber,
          sku,
          title: '',
          status: finalStatus,
          quantity: parsedQuantity,
          notes,
          dateAdded: new Date().toISOString()
        };
      });

      await bulkAdd(items);
      setBulkText('');
      setIsBulkDialogOpen(false);
      toast({ title: "Success", description: `Added ${items.length} items successfully` });
    } catch (error) {
      console.error('Error bulk adding items:', error);
      toast({ title: "Error", description: "Failed to add items", variant: "destructive" });
    }
  };

  const handleQuantityUpdate = async (id: string, newQuantity: number, reason?: string) => {
    try {
      await updateQuantity(id, newQuantity, reason);
      toast({ title: "Success", description: "Quantity updated successfully" });
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" });
    }
  };

  const handleRestockEligibilityChange = async (itemId: string, eligible: boolean) => {
    try {
      await updateRestockEligibility(itemId, eligible);
      toast({ title: "Success", description: `Restock eligibility ${eligible ? 'enabled' : 'disabled'}` });
    } catch (error) {
      console.error('Error updating restock eligibility:', error);
      toast({ title: "Error", description: "Failed to update restock eligibility", variant: "destructive" });
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = () => {
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const updateBin = async (id: string, binLocation: string) => {
    // Implementation for updating bin location
    console.log('Updating bin location for item:', id, 'to:', binLocation);
  };

  // Simplified print functions for now
  const handlePrintItem = (items: AsinInventoryItem[]) => {
    console.log('Print items:', items);
    toast({ title: "Info", description: "Print functionality not yet implemented" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading your inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[95vw] mx-auto p-6">
      {/* Header with Stats */}
      <div className="space-y-6">
        <InventoryMetrics showOnlyAsin={true} />
      </div>

      {/* Enhanced Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-hover:text-primary" />
              <Input
                placeholder={
                  searchMethod === 'all' ? "Search by ASIN, Serial, SKU, Title, or Notes..." :
                  searchMethod === 'asin' ? "Search by ASIN..." :
                  searchMethod === 'sku' ? "Search by SKU..." :
                  searchMethod === 'serial' ? "Search by Serial Number..." :
                  searchMethod === 'title' ? "Search by Title..." :
                  "Search by Bin Location..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-32 h-14 text-lg font-medium border-2 border-primary/20 focus:border-primary/60 bg-gradient-to-r from-background to-background/80 shadow-lg rounded-lg transition-all duration-300 hover:shadow-xl focus:shadow-xl hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <Select value={searchMethod} onValueChange={(value: any) => setSearchMethod(value)}>
                  <SelectTrigger className="w-28 h-9 text-xs bg-background/80 border border-primary/20 hover:border-primary/40 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                    <SelectItem value="all">All Fields</SelectItem>
                    <SelectItem value="asin">ASIN</SelectItem>
                    <SelectItem value="sku">SKU</SelectItem>
                    <SelectItem value="serial">Serial</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="notes">Bin</SelectItem>
                  </SelectContent>
                </Select>
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <Collapsible open={isFeaturesOpen} onOpenChange={setIsFeaturesOpen}>
              <div className="flex flex-wrap gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="border-2 border-primary bg-background hover:bg-primary hover:text-white transition-all">
                    <Settings className="w-4 h-4 mr-2" />
                    Advanced Features
                    {isFeaturesOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="border-2 border-primary bg-background text-primary hover:bg-primary hover:text-white transition-all">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Inventory Item</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="asin">ASIN *</Label>
                          <Input
                            id="asin"
                            value={newItem.asin}
                            onChange={(e) => setNewItem({ ...newItem, asin: e.target.value })}
                            placeholder="B123456789"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="serialNumber">Serial Number</Label>
                          <Input
                            id="serialNumber"
                            value={newItem.serialNumber}
                            onChange={(e) => setNewItem({ ...newItem, serialNumber: e.target.value })}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sku">SKU</Label>
                          <Input
                            id="sku"
                            value={newItem.sku}
                            onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                            placeholder="Your SKU"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={newItem.title}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            placeholder="Product title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select value={newItem.status} onValueChange={(value: AsinInventoryItem['status']) => setNewItem({ ...newItem, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in-stock">In Stock</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                            min="0"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={newItem.notes}
                            onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                            placeholder="Add any notes..."
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddItem}>Add Item</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="border-2 border-primary bg-background hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Add Items
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Bulk Add ASIN Items</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bulkText">
                            Paste tab-separated data (Only ASIN is required, other fields are optional)
                          </Label>
                          <Textarea
                            id="bulkText"
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                            placeholder="B123456789	SN001	SKU123	in-stock	5	Optional notes&#10;B987654321		SKU456		0	Zero qty item (auto-sold)&#10;B555555555			in-stock	3	Only ASIN and quantity"
                            rows={8}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p><strong>Format:</strong> Each line should contain tab-separated values</p>
                          <p><strong>Required:</strong> ASIN (first field only)</p>
                          <p><strong>Optional:</strong> Serial Number → SKU → Status → Quantity → Notes</p>
                          <p><strong>Note:</strong> Items with 0 quantity are automatically marked as 'sold'</p>
                          <p><strong>Status options:</strong> in-stock, sold, reserved, damaged</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleBulkAdd}>Add Items</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <BulkSkuUpload inventory={inventory} onSkuUpdate={bulkUpdateSkus} />
                  <BulkTitleUpload inventory={inventory} onTitleUpdate={bulkUpdateTitles} />
                  <SimpleWarehouseManager />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Enhanced Quick Filters */}
            <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border border-primary/10">
              <div className="flex items-center text-sm font-semibold text-muted-foreground mr-2">
                <Filter className="h-4 w-4 mr-2" />
                Quick Filters:
              </div>
              <Button
                variant={quickFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter('all')}
                className="text-xs font-medium transition-all duration-200 hover:scale-105"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                All ({filteredInventory.length})
              </Button>
              <Button
                variant={quickFilter === 'low-stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter('low-stock')}
                className="text-xs font-medium transition-all duration-200 hover:scale-105"
              >
                <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                <TrendingDown className="h-3 w-3 mr-1" />
                Low Stock ({filteredInventory.filter(item => item.quantity > 0 && item.quantity <= 5).length})
              </Button>
              <Button
                variant={quickFilter === 'out-of-stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter('out-of-stock')}
                className="text-xs font-medium transition-all duration-200 hover:scale-105"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Out of Stock ({filteredInventory.filter(item => item.quantity === 0).length})
              </Button>
              <Button
                variant={quickFilter === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter('recent')}
                className="text-xs font-medium transition-all duration-200 hover:scale-105"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <Clock className="h-3 w-3 mr-1" />
                Recent ({filteredInventory.filter(item => {
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  return new Date(item.dateAdded) >= sevenDaysAgo;
                }).length})
              </Button>
            </div>

            {/* Date Filter for Out of Stock */}
            {quickFilter === 'out-of-stock' && (
              <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">Date Added:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3 text-xs">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateFilterFrom ? format(dateFilterFrom, 'MMM dd, yyyy') : 'From date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFilterFrom}
                        onSelect={setDateFilterFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3 text-xs">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateFilterTo ? format(dateFilterTo, 'MMM dd, yyyy') : 'To date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFilterTo}
                        onSelect={setDateFilterTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {(dateFilterFrom || dateFilterTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFilterFrom(undefined);
                        setDateFilterTo(undefined);
                      }}
                      className="h-9 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Filters and Controls */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">View:</Label>
                <div className="flex border rounded-lg p-1 bg-muted/30">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 px-3 text-xs"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 px-3 text-xs"
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Grid
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Per page:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-20 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Results:</Label>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                  {Math.min(startIndex + 1, filteredInventory.length)}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Display */}
      {filteredInventory.length === 0 ? (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No inventory items found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchTerm || statusFilter !== 'all' || quickFilter !== 'all' ? "Try adjusting your filters or search terms" : "Get started by adding your first inventory item"}
            </p>
            {!searchTerm && statusFilter === 'all' && quickFilter === 'all' && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto border-2 border-primary/10 rounded-lg shadow-lg bg-gradient-to-r from-background to-background/95">
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-r from-primary/10 to-accent/10 border-b-2 border-primary/20">
                  <tr>
                    <th className="w-12 p-4 text-left border-r-2 border-primary/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <Checkbox 
                          checked={selectedItems.size === paginatedInventory.length && paginatedInventory.length > 0} 
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems(new Set(paginatedInventory.map(item => item.id)));
                            } else {
                              setSelectedItems(new Set());
                            }
                          }}
                          className="border-2 border-primary/30"
                        />
                      </div>
                    </th>
                    <th className="min-w-80 p-4 text-left font-semibold border-r-2 border-primary/10">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <Package className="h-4 w-4" />
                        Product Info
                      </div>
                    </th>
                    <th className="w-28 p-4 text-left font-semibold border-r-2 border-primary/10">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <Database className="h-4 w-4" />
                        Serial Number
                      </div>
                    </th>
                    <th className="w-20 p-4 text-left font-semibold border-r-2 border-primary/10">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <Activity className="h-4 w-4" />
                        Status
                      </div>
                    </th>
                    <th className="w-16 p-4 text-left font-semibold border-r-2 border-primary/10">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <BarChart3 className="h-4 w-4" />
                        Qty
                      </div>
                    </th>
                    <th className="w-32 p-4 text-left font-semibold border-r-2 border-primary/10">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                        <Star className="w-4 h-4" />
                        Restock Eligibility
                      </div>
                    </th>
                    <th className="w-24 p-4 text-left font-semibold border-r-2 border-primary/10">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        <Download className="w-4 w-4" />
                        Export Mode
                      </div>
                    </th>
                    <th className="w-32 p-4 text-left font-semibold">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <Settings className="w-4 h-4" />
                        Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventory.map((item, index) => (
                    <tr key={item.id} className={cn(
                      "border-b-2 border-primary/5 transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 hover:shadow-md",
                      index % 2 === 0 ? "bg-background" : "bg-muted/30"
                    )}>
                      <td className="p-4 border-r-2 border-primary/5">
                        <Checkbox 
                          checked={selectedItems.has(item.id)} 
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedItems);
                            if (checked) {
                              newSelected.add(item.id);
                            } else {
                              newSelected.delete(item.id);
                            }
                            setSelectedItems(newSelected);
                          }}
                          className="border-2 border-primary/30 hover:border-primary/50 transition-colors"
                        />
                      </td>
                      <td className="p-4 border-r-2 border-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="transition-transform duration-200 hover:scale-105">
                            <ProductImage asin={item.asin} />
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium text-sm max-w-xs break-words bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/20 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800">
                              {item.title || 'No title'}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/20 px-2 py-1 rounded border border-green-200 dark:border-green-800">
                              ASIN: {item.asin}
                            </div>
                            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/20 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-800">
                              <span className="text-xs text-muted-foreground font-medium">SKU:</span>
                              <SkuEditor currentSku={item.sku} onUpdate={newSku => updateSku(item.id, newSku)} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm border-r-2 border-primary/5">
                        <div className="bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-md border border-purple-200 dark:border-purple-800">
                          <SerialNumberEditor 
                            currentSerialNumber={item.serialNumber} 
                            onUpdate={newSerialNumber => updateSerialNumber(item.id, newSerialNumber)} 
                          />
                        </div>
                      </td>
                      <td className="p-4 border-r-2 border-primary/5">
                        <div className="bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-md border border-green-200 dark:border-green-800">
                          <Badge variant={item.status === 'in-stock' ? 'default' : 'secondary'} className="text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                item.status === 'in-stock' ? "bg-green-500" : "bg-blue-500"
                              )}></div>
                              {item.status === 'in-stock' ? 'In Stock' : item.status}
                            </div>
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 border-r-2 border-primary/5">
                        <div className="bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-md border border-orange-200 dark:border-orange-800">
                        <DualQuantityEditor 
                          currentQuantity={item.quantity}
                          onUpdate={(newQuantity, reason) => handleQuantityUpdate(item.id, newQuantity, reason)} 
                        />
                        </div>
                      </td>
                      <td className="p-4 border-r-2 border-primary/5">
                        <div className="bg-gradient-to-r from-teal-100 to-teal-50 dark:from-teal-900/20 dark:to-teal-800/20 p-3 rounded-md border border-teal-200 dark:border-teal-800">
                          <div className="flex items-center gap-3">
                            <Switch 
                              checked={item.eligible_for_restock} 
                              onCheckedChange={checked => handleRestockEligibilityChange(item.id, checked)}
                              className="border-2 border-primary/30 data-[state=checked]:border-primary hover:border-primary/60 transition-all duration-200"
                            />
                            <Label className="text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full transition-colors",
                                  item.eligible_for_restock ? "bg-green-500" : "bg-red-500"
                                )}></div>
                                {item.eligible_for_restock ? 'Eligible' : 'Not Eligible'}
                              </div>
                            </Label>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 border-r-2 border-primary/5">
                        <div className="bg-gradient-to-r from-cyan-100 to-cyan-50 dark:from-cyan-900/20 dark:to-cyan-800/20 p-3 rounded-md border border-cyan-200 dark:border-cyan-800">
                          <div className="flex items-center gap-3">
                            <Switch
                              id={`export-mode-${item.id}`}
                              checked={exportModes[item.id] === 'local'}
                              onCheckedChange={(checked) => {
                                setExportModes(prev => ({
                                  ...prev,
                                  [item.id]: checked ? 'local' : 'global'
                                }));
                              }}
                              className="border-2 border-primary/30 data-[state=checked]:border-primary hover:border-primary/60 transition-all duration-200"
                            />
                            <Label htmlFor={`export-mode-${item.id}`} className="text-sm font-semibold">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-2 h-2 rounded-full transition-colors",
                                  exportModes[item.id] === 'local' ? "bg-green-500" : "bg-blue-500"
                                )}></div>
                                {exportModes[item.id] === 'local' ? 'Local' : 'Global'}
                              </div>
                            </Label>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintItem([item])}
                            disabled={!qzConnected || !selectedTemplate}
                            title={!qzConnected ? "QZ Tray not connected" : !selectedTemplate ? "No template selected" : "Print label"}
                            className="transition-all duration-200 hover:scale-105 hover:bg-primary/10 border-primary/30"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          
                        <div className="transition-all duration-200 hover:scale-105">
                          <StockHistoryDialog 
                            inventoryId={item.id}
                            itemIdentifier={item.asin}
                            inventoryType="asin"
                          />
                        </div>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this item?')) {
                                toast({ title: "Success", description: "Item deleted" });
                              }
                            }}
                            className="transition-all duration-200 hover:scale-105 hover:bg-destructive/20 border-destructive/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedInventory.map(item => (
            <Card key={item.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={selectedItems.has(item.id)} 
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedItems);
                          if (checked) {
                            newSelected.add(item.id);
                          } else {
                            newSelected.delete(item.id);
                          }
                          setSelectedItems(newSelected);
                        }} 
                      />
                      <Badge variant={item.status === 'in-stock' ? 'default' : 'secondary'} className="text-xs">
                        {item.status === 'in-stock' ? 'In Stock' : item.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handlePrintItem([item])}>
                        <Printer className="h-3 w-3" />
                      </Button>
                      <StockHistoryDialog 
                        inventoryId={item.id}
                        itemIdentifier={item.asin}
                        inventoryType="asin"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <ProductImage asin={item.asin} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {item.title || 'No title'}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {item.asin}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">SKU:</span>
                      <div className="font-mono">
                        <SkuEditor currentSku={item.sku} onUpdate={newSku => updateSku(item.id, newSku)} />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Serial:</span>
                      <div className="font-mono">
                        <SerialNumberEditor 
                          currentSerialNumber={item.serialNumber} 
                          onUpdate={newSerialNumber => updateSerialNumber(item.id, newSerialNumber)} 
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <div>
                        <DualQuantityEditor 
                          currentQuantity={item.quantity}
                          onUpdate={(newQuantity, reason) => handleQuantityUpdate(item.id, newQuantity, reason)} 
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Restock:</span>
                      <div className="mt-1">
                        <Switch 
                          checked={item.eligible_for_restock} 
                          onCheckedChange={checked => handleRestockEligibilityChange(item.id, checked)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`export-mode-grid-${item.id}`}
                        checked={exportModes[item.id] === 'local'}
                        onCheckedChange={(checked) => {
                          setExportModes(prev => ({
                            ...prev,
                            [item.id]: checked ? 'local' : 'global'
                          }));
                        }}
                        className="scale-75"
                      />
                      <Label htmlFor={`export-mode-grid-${item.id}`} className="text-xs">
                        {exportModes[item.id] === 'local' ? 'Local' : 'Global'}
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious onClick={() => setCurrentPage(prev => prev - 1)} />
                </PaginationItem>
              )}
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : 
                           currentPage >= totalPages - 2 ? totalPages - 4 + i : 
                           currentPage - 2 + i;
                return page > 0 && page <= totalPages ? (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ) : null;
              })}
              
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext onClick={() => setCurrentPage(prev => prev + 1)} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <div className="flex items-center justify-center">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Product preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-center text-muted-foreground">Failed to load image</div>';
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
