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
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar as CalendarIcon, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star, Edit3, Activity, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DualQuantityEditor } from './DualQuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';
import { SkuEditor } from './SkuEditor';
import { TitleEditor } from './TitleEditor';
import { InventoryMetrics } from './InventoryMetrics';
import { InventoryDashboard } from './InventoryDashboard';
import { BulkSkuUpload } from './BulkSkuUpload';
import { BulkTitleUpload } from './BulkTitleUpload';
import { SimpleWarehouseManager } from './SimpleWarehouseManager';
import { LabelTemplateManager } from './LabelTemplateManager';
import { useWarehouseManager } from '@/hooks/useWarehouseManager';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { generateOrderLabelZPL, type OrderItem, type OrderLabelSettings } from '@/utils/order-label-printer';
import { PrintService } from '@/services/print-service';
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
    updateTitle,
    bulkUpdateSkus,
    bulkUpdateTitles,
    fetchTitlesFromSunsky,
    refetch
  } = useAsinInventory();

  const { user } = useUserProfile();
  const { runTitleFetch } = useBackgroundTasks();
  const { selectedWarehouse } = useWarehouseManager();
  const { toast } = useToast();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMethod, setSearchMethod] = useState<'all' | 'asin' | 'sku' | 'serial' | 'title' | 'notes'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'asin' | 'quantity' | 'status' | 'title' | 'serialNumber'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<AsinInventoryItem | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [isBulkQuantityDialogOpen, setIsBulkQuantityDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<AsinInventoryItem['status']>('in-stock');
  const [bulkQuantityValue, setBulkQuantityValue] = useState(1);
  const [bulkQuantityReason, setBulkQuantityReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [quickFilter, setQuickFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'recent'>('all');
  const [dateFilterFrom, setDateFilterFrom] = useState<Date>();
  const [dateFilterTo, setDateFilterTo] = useState<Date>();

  // Form states
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

  // Calculate duplicate ASINs from original inventory data
  const duplicateData = useMemo(() => {
    const asinCounts = new Map<string, AsinInventoryItem[]>();

    // Group original inventory by ASIN
    inventory.forEach(item => {
      if (!asinCounts.has(item.asin)) {
        asinCounts.set(item.asin, []);
      }
      asinCounts.get(item.asin)!.push(item);
    });

    // Filter to only duplicates (more than 1 item per ASIN)
    const duplicates = new Map<string, AsinInventoryItem[]>();
    asinCounts.forEach((items, asin) => {
      if (items.length > 1) {
        duplicates.set(asin, items);
      }
    });

    return {
      duplicates,
      totalDuplicateASINs: duplicates.size,
      totalDuplicateItems: Array.from(duplicates.values()).reduce((sum, items) => sum + items.length, 0)
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    // Apply search filter
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      filtered = filtered.filter(item => {
        if (searchMethod === 'all') {
          return searchTerms.every(term => {
            const asinMatch = item.asin.toLowerCase().includes(term);
            const serialMatch = item.serialNumber.toLowerCase().includes(term);
            const skuMatch = item.sku && item.sku.toLowerCase().includes(term);
            const titleMatch = item.title && item.title.toLowerCase().includes(term);
            const notesMatch = item.notes && item.notes.toLowerCase().includes(term);
            return asinMatch || serialMatch || skuMatch || titleMatch || notesMatch;
          });
        } else if (searchMethod === 'asin') {
          return searchTerms.every(term => item.asin.toLowerCase().includes(term));
        } else if (searchMethod === 'sku') {
          return item.sku && searchTerms.every(term => item.sku.toLowerCase().includes(term));
        } else if (searchMethod === 'serial') {
          return searchTerms.every(term => item.serialNumber.toLowerCase().includes(term));
        } else if (searchMethod === 'title') {
          return item.title && searchTerms.every(term => item.title.toLowerCase().includes(term));
        } else if (searchMethod === 'notes') {
          return item.notes && searchTerms.every(term => item.notes.toLowerCase().includes(term));
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
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [inventory, searchTerm, statusFilter, sortBy, sortOrder, quickFilter, dateFilterFrom, dateFilterTo, searchMethod]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const handleAddItem = async () => {
    if (!newItem.asin.trim() || !newItem.serialNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "ASIN and Serial Number are required",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate ASIN in current inventory
    const duplicateAsin = inventory.find(item => item.asin.toLowerCase() === newItem.asin.toLowerCase().trim());
    if (duplicateAsin) {
      toast({
        title: "Duplicate ASIN",
        description: `ASIN "${newItem.asin}" already exists in inventory. Each ASIN must be unique.`,
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate SKU in current inventory (if SKU is provided)
    if (newItem.sku && newItem.sku.trim()) {
      const duplicateSku = inventory.find(item => item.sku && item.sku.toLowerCase() === newItem.sku.toLowerCase().trim());
      if (duplicateSku) {
        toast({
          title: "Duplicate SKU",
          description: `SKU "${newItem.sku}" already exists in inventory. Each SKU must be unique.`,
          variant: "destructive"
        });
        return;
      }
    }

    await addItem({
      ...newItem,
      dateAdded: new Date().toISOString()
    });

    setIsAddDialogOpen(false);
    setNewItem({
      asin: '',
      serialNumber: '',
      sku: '',
      title: '',
      status: 'in-stock',
      quantity: 1,
      notes: ''
    });

    toast({
      title: "Success",
      description: "Item added successfully"
    });
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter some data to import",
        variant: "destructive"
      });
      return;
    }

    const lines = bulkText.trim().split('\n');
    const items = [];

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 4) {
        items.push({
          asin: parts[0].trim(),
          serialNumber: parts[1].trim(),
          sku: parts[2]?.trim() || '',
          status: parts[3].trim() as AsinInventoryItem['status'],
          quantity: parseInt(parts[4]) || 1,
          notes: parts[5]?.trim() || '',
          dateAdded: new Date().toISOString()
        });
      }
    }

    if (items.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid items found in the input",
        variant: "destructive"
      });
      return;
    }

    await bulkAdd(items);
    setBulkText('');
    setIsBulkDialogOpen(false);
    
    toast({
      title: "Success",
      description: `Added ${items.length} items to inventory`
    });
  };

  const handleTestPrint = async (item: AsinInventoryItem) => {
    try {
      // Check if QZ Tray is connected
      const connected = qzConnectionManager.getConnectionStatus();
      if (!connected) {
        toast({
          title: "QZ Tray Not Connected",
          description: "Please connect QZ Tray from the status indicator in the header first",
          variant: "destructive"
        });
        return;
      }

      // Default label settings
      let labelSettings: OrderLabelSettings = {
        labelSize: '4x3',
        dpi: 203,
        showOrderId: false,
        showAsin: true,
        showSku: true,
        showTitle: true,
        showQuantity: true,
        includeBarcode: true,
        barcodeContent: 'asin'
      };

      // Check for saved template to get label size
      const savedTemplate = localStorage.getItem('savedLabelTemplate');
      if (savedTemplate) {
        try {
          const { data: template } = await supabase.from('label_templates').select('*').eq('id', savedTemplate).single();
          if (template) {
            const aspectRatio = template.width / template.height;
            if (aspectRatio >= 1.8) {
              labelSettings.labelSize = '4x6';
            } else if (aspectRatio >= 1.3) {
              labelSettings.labelSize = '4x3';
            } else if (aspectRatio >= 1.1) {
              labelSettings.labelSize = '3x2';
            } else {
              labelSettings.labelSize = '2x1';
            }
          }
        } catch (error) {
          console.log('Could not load template settings');
        }
      }

      // Create order item for printing
      const orderItem: OrderItem = {
        orderId: item.serialNumber,
        asin: item.asin,
        sku: item.sku || undefined,
        itemTitle: item.title || `Product ${item.asin}`,
        itemQuantity: item.quantity
      };

      // Generate ZPL code
      const zplCode = generateOrderLabelZPL(orderItem, labelSettings);

      // Print the label
      const savedDefaultPrinter = localStorage.getItem('qz-default-printer');
      await qzConnectionManager.print(zplCode, savedDefaultPrinter || undefined);

      toast({
        title: "Label Printed",
        description: `Printed label for ${item.asin}`
      });
    } catch (error) {
      console.error('Error printing label:', error);
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Failed to print label",
        variant: "destructive"
      });
    }
  };

  const exportInventory = () => {
    const csvData = [
      ['SKU', 'UPC', 'ASIN', 'Title', 'Warehouse', 'Warehouse name', 'Available units', 'Status'],
      ...filteredInventory.map(item => [
        item.sku || '',
        '',
        item.asin,
        item.title || '',
        selectedWarehouse?.code || '',
        selectedWarehouse?.name || '',
        item.quantity.toString(),
        item.status
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedItems.size === 0) return;
    
    for (const itemId of selectedItems) {
      await updateItemStatus(itemId, bulkStatusValue);
    }
    
    setSelectedItems(new Set());
    setIsBulkStatusDialogOpen(false);
    
    toast({
      title: "Success",
      description: `Updated status for ${selectedItems.size} items`
    });
  };

  const handleBulkQuantityUpdate = async () => {
    if (selectedItems.size === 0) return;
    
    for (const itemId of selectedItems) {
      await updateQuantity(itemId, bulkQuantityValue, bulkQuantityReason);
    }
    
    setSelectedItems(new Set());
    setIsBulkQuantityDialogOpen(false);
    
    toast({
      title: "Success",
      description: `Updated quantity for ${selectedItems.size} items`
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading inventory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inventory.filter(item => item.status === 'in-stock').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold Items</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {inventory.filter(item => item.status === 'sold' || item.status === 'ordered').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="flex gap-2">
            <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Add
            </Button>
            <Button variant="outline" onClick={exportInventory}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Select value={viewMode} onValueChange={(value: 'table' | 'grid') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Table
                </div>
              </SelectItem>
              <SelectItem value="grid">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Grid
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={searchMethod} onValueChange={(value: any) => setSearchMethod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              <SelectItem value="asin">ASIN</SelectItem>
              <SelectItem value="sku">SKU</SelectItem>
              <SelectItem value="serial">Serial</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={quickFilter} onValueChange={(value: any) => setQuickFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            <SelectItem value="recent">Recent (7d)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory Items ({filteredInventory.length})</CardTitle>
            {selectedItems.size > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsBulkStatusDialogOpen(true)}
                >
                  Update Status ({selectedItems.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsBulkQuantityDialogOpen(true)}
                >
                  Update Quantity ({selectedItems.size})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4">
                    <Checkbox
                      checked={selectedItems.size === paginatedInventory.length && paginatedInventory.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(new Set(paginatedInventory.map(item => item.id)));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-4 font-medium">ASIN</th>
                  <th className="text-left p-4 font-medium">Serial #</th>
                  <th className="text-left p-4 font-medium">SKU</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Qty</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Date Added</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInventory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
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
                    </td>
                    <td className="p-4 font-mono text-sm">{item.asin}</td>
                    <td className="p-4 font-mono text-sm">{item.serialNumber}</td>
                    <td className="p-4">
                      <SkuEditor
                        currentSku={item.sku || ''}
                        onUpdate={(newSku) => updateSku(item.id, newSku)}
                      />
                    </td>
                    <td className="p-4 max-w-xs">
                      <TitleEditor
                        currentTitle={item.title || ''}
                        onUpdate={(newTitle) => updateTitle(item.id, newTitle)}
                      />
                    </td>
                    <td className="p-4">
                      <DualQuantityEditor
                        currentQuantity={item.quantity}
                        onUpdate={(qty, reason) => updateQuantity(item.id, qty, reason)}
                      />
                    </td>
                    <td className="p-4">
                      <Select
                        value={item.status}
                        onValueChange={(value: AsinInventoryItem['status']) => 
                          updateItemStatus(item.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-stock">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              In Stock
                            </div>
                          </SelectItem>
                          <SelectItem value="sold">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              Sold
                            </div>
                          </SelectItem>
                          <SelectItem value="reserved">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              Reserved
                            </div>
                          </SelectItem>
                          <SelectItem value="ordered">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              Ordered
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(item.dateAdded), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestPrint(item)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <StockHistoryDialog
                          inventoryId={item.id}
                          itemIdentifier={item.asin}
                          inventoryType="asin"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={page === currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && <PaginationEllipsis />}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="asin">ASIN *</Label>
              <Input
                id="asin"
                value={newItem.asin}
                onChange={(e) => setNewItem({...newItem, asin: e.target.value})}
                placeholder="B07XXXXX"
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number *</Label>
              <Input
                id="serialNumber"
                value={newItem.serialNumber}
                onChange={(e) => setNewItem({...newItem, serialNumber: e.target.value})}
                placeholder="SNxxxxxxx"
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={newItem.sku}
                onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                placeholder="Optional SKU"
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newItem.title}
                onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                placeholder="Product title"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={newItem.status}
                onValueChange={(value: AsinInventoryItem['status']) => setNewItem({...newItem, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newItem.notes}
                onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Add Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulkText">
                Paste tab-separated data (ASIN, Serial, SKU, Status, Quantity, Notes)
              </Label>
              <Textarea
                id="bulkText"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="B07XXXXX	SN123456	SKU123	in-stock	1	Notes"
                className="min-h-32"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Format: Each line should contain ASIN, Serial Number, SKU, Status, Quantity, and Notes separated by tabs.
              Status options: in-stock, sold, reserved, ordered
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAdd}>
              Add Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status for Selected Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select
                value={bulkStatusValue}
                onValueChange={(value: AsinInventoryItem['status']) => setBulkStatusValue(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              This will update the status for {selectedItems.size} selected items.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Quantity Update Dialog */}
      <Dialog open={isBulkQuantityDialogOpen} onOpenChange={setIsBulkQuantityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Quantity for Selected Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Quantity</Label>
              <Input
                type="number"
                min="0"
                value={bulkQuantityValue}
                onChange={(e) => setBulkQuantityValue(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Input
                value={bulkQuantityReason}
                onChange={(e) => setBulkQuantityReason(e.target.value)}
                placeholder="e.g., Stock adjustment, Sale, etc."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              This will update the quantity for {selectedItems.size} selected items.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkQuantityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkQuantityUpdate}>
              Update Quantity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}