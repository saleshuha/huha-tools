import { useState, useMemo, useEffect } from 'react';
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
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar as CalendarIcon, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star, Edit3, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DualQuantityEditor } from './DualQuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';
import { SkuEditor } from './SkuEditor';
import { InventoryMetrics } from './InventoryMetrics';
import { InventoryDashboard } from './InventoryDashboard';
import { BulkSkuUpload } from './BulkSkuUpload';
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
    bulkUpdateSkus,
    refetch
  } = useAsinInventory();
  const {
    user
  } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'asin' | 'quantity' | 'status'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [isBulkQuantityDialogOpen, setIsBulkQuantityDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<AsinInventoryItem['status']>('in-stock');
  const [bulkQuantityValue, setBulkQuantityValue] = useState(1);
  const [bulkQuantityReason, setBulkQuantityReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [quickFilter, setQuickFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'recent'>('all');
  const [dateFilterFrom, setDateFilterFrom] = useState<Date>();
  const [dateFilterTo, setDateFilterTo] = useState<Date>();
  const {
    toast
  } = useToast();

  // Form states
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    sku: string;
    status: AsinInventoryItem['status'];
    quantity: number;
    notes: string;
  }>({
    asin: '',
    serialNumber: '',
    sku: '',
    status: 'in-stock',
    quantity: 1,
    notes: ''
  });
  const [bulkText, setBulkText] = useState('');
  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    // Apply search filter
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      console.log('Search Terms:', searchTerms);
      console.log('Total Inventory Items:', inventory.length);
      
      filtered = filtered.filter(item => {
        const matches = searchTerms.every(term => 
          item.asin.toLowerCase().includes(term) || 
          item.serialNumber.toLowerCase().includes(term) || 
          (item.sku && item.sku.toLowerCase().includes(term)) ||
          (item.notes && item.notes.toLowerCase().includes(term))
        );
        return matches;
      });
      
      console.log('Filtered Results:', filtered.length);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
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
      }
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    return filtered;
  }, [inventory, searchTerm, statusFilter, sortBy, sortOrder, quickFilter, dateFilterFrom, dateFilterTo]);
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
    await addItem({
      ...newItem,
      dateAdded: new Date().toISOString()
    });
    setIsAddDialogOpen(false);
    setNewItem({
      asin: '',
      serialNumber: '',
      sku: '',
      status: 'in-stock',
      quantity: 1,
      notes: ''
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
  const exportInventory = () => {
    const csvData = [['ASIN', 'Serial Number', 'SKU', 'Status', 'Quantity', 'Date Added', 'Notes'], ...filteredInventory.map(item => [item.asin, item.serialNumber, item.sku || '', item.status, item.quantity.toString(), new Date(item.dateAdded).toLocaleDateString(), item.notes || ''])];
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asin-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Complete",
      description: "Inventory data exported to CSV file"
    });
  };
  const emailInventory = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('send-inventory-email', {
        body: {
          inventory: filteredInventory,
          userEmail: user?.email
        }
      });
      if (error) throw error;
      toast({
        title: "Email Sent",
        description: "Inventory report sent to your email"
      });
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "Could not send email report",
        variant: "destructive"
      });
    }
  };
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Inventory data refreshed"
    });
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading your inventory...</p>
        </div>
      </div>;
  }
  return <div className="space-y-6 max-w-[95vw] mx-auto p-6">
      {/* Header with Stats */}
      <div className="space-y-6">
        <InventoryMetrics showOnlyAsin={true} />
      </div>

      {/* Prominent Search Bar */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Enhanced Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
              <Input placeholder="🔍 Advanced search: ASIN, Serial Number, SKU, Notes (use spaces for multiple terms)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-14 h-16 text-xl font-medium shadow-lg border-2 border-primary/60 focus:border-primary ring-2 ring-primary/10 focus:ring-primary/20 bg-background/50" />
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Actions:
              </Label>
              <div className="flex flex-wrap gap-3">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white">
                      <Plus className="w-5 h-5 mr-2" />
                      Add New Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add New ASIN Item
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="asin">ASIN</Label>
                        <Input id="asin" value={newItem.asin} onChange={e => setNewItem({
                        ...newItem,
                        asin: e.target.value
                      })} placeholder="Enter ASIN..." />
                      </div>
                      <div>
                        <Label htmlFor="serialNumber">Serial Number</Label>
                        <Input id="serialNumber" value={newItem.serialNumber} onChange={e => setNewItem({
                        ...newItem,
                        serialNumber: e.target.value
                      })} placeholder="Enter Serial Number..." />
                      </div>
                       <div>
                         <Label htmlFor="sku">SKU (Optional)</Label>
                         <Input id="sku" value={newItem.sku} onChange={e => setNewItem({
                         ...newItem,
                         sku: e.target.value
                       })} placeholder="Enter SKU (optional)" />
                       </div>
                       <div>
                         <Label htmlFor="quantity">Quantity</Label>
                         <Input id="quantity" type="number" min="1" value={newItem.quantity} onChange={e => setNewItem({
                         ...newItem,
                         quantity: parseInt(e.target.value) || 1
                       })} />
                       </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={newItem.status} onValueChange={(value: AsinInventoryItem['status']) => setNewItem({
                        ...newItem,
                        status: value
                      })}>
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
                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea id="notes" value={newItem.notes} onChange={e => setNewItem({
                        ...newItem,
                        notes: e.target.value
                      })} placeholder="Add any notes..." rows={2} />
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
                    <Button size="lg" variant="outline" className="border-2 hover:border-primary/50">
                      <Upload className="w-5 h-5 mr-2" />
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
                           Paste tab-separated data (ASIN, Serial Number, SKU, Status, Quantity, Notes)
                         </Label>
                         <Textarea id="bulkText" value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="B123456789	SN001	SKU123	in-stock	5	Optional notes&#10;B987654321	SN002	SKU456	sold	1	Another item" rows={8} className="font-mono text-sm" />
                       </div>
                       <div className="text-sm text-muted-foreground">
                         <p><strong>Format:</strong> Each line should contain tab-separated values</p>
                         <p><strong>Order:</strong> ASIN → Serial Number → SKU → Status → Quantity → Notes</p>
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

                <BulkSkuUpload 
                  inventory={inventory}
                  onSkuUpdate={bulkUpdateSkus}
                />
                <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/5" onClick={exportInventory}>
                  <Download className="w-5 h-5 mr-2" />
                  Export
                </Button>
                <Button size="lg" variant="outline" className="border-blue-300 hover:bg-blue-50" onClick={handleRefresh}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh
                </Button>
                <Button size="lg" variant="outline" className="border-purple-300 hover:bg-purple-50" onClick={emailInventory}>
                  <Mail className="w-5 h-5 mr-2" />
                  Email Report
                </Button>
              </div>
            </div>

            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Quick Filters:
              </Label>
              <Button variant={quickFilter === 'all' ? 'default' : 'outline'} size="lg" onClick={() => setQuickFilter('all')} className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                All Items
              </Button>
              <Button variant={quickFilter === 'low-stock' ? 'default' : 'outline'} size="lg" onClick={() => setQuickFilter('low-stock')} className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Low Stock
              </Button>
              <Button variant={quickFilter === 'out-of-stock' ? 'default' : 'outline'} size="lg" onClick={() => setQuickFilter('out-of-stock')} className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Out of Stock
              </Button>
              <Button variant={quickFilter === 'recent' ? 'default' : 'outline'} size="lg" onClick={() => setQuickFilter('recent')} className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent (7 days)
              </Button>
            </div>

            {/* Date Filter Section - Only show when out-of-stock filter is active */}
            {quickFilter === 'out-of-stock' && (
              <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Date Filter:
                </Label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">From:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[160px] justify-start text-left font-normal",
                            !dateFilterFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterFrom ? format(dateFilterFrom, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilterFrom}
                          onSelect={setDateFilterFrom}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">To:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[160px] justify-start text-left font-normal",
                            !dateFilterTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilterTo ? format(dateFilterTo, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFilterTo}
                          onSelect={setDateFilterTo}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setDateFilterFrom(undefined);
                      setDateFilterTo(undefined);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Dates
                  </Button>
                </div>
              </div>
            )}

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Status Filter */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-background border">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-stock">In Stock Only</SelectItem>
                    <SelectItem value="sold">Sold Only</SelectItem>
                    <SelectItem value="reserved">Reserved Only</SelectItem>
                    <SelectItem value="damaged">Damaged Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">View:</Label>
                <div className="flex border rounded-lg p-1 bg-background">
                  <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-8">
                    <List className="w-4 h-4 mr-1" />
                    Table
                  </Button>
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8">
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Grid
                  </Button>
                </div>
              </div>

              {/* Items per page */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Show:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={value => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20 bg-background border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Info */}
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
      {filteredInventory.length === 0 ? <Card className="border-dashed border-2 border-muted">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No inventory items found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchTerm || statusFilter !== 'all' || quickFilter !== 'all' ? "Try adjusting your filters or search terms" : "Get started by adding your first inventory item"}
            </p>
            {!searchTerm && statusFilter === 'all' && quickFilter === 'all' && <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>}
          </CardContent>
        </Card> : viewMode === 'table' ? <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="p-4 text-left">
                      <Checkbox checked={selectedItems.size === paginatedInventory.length && paginatedInventory.length > 0} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedItems(new Set(paginatedInventory.map(item => item.id)));
                    } else {
                      setSelectedItems(new Set());
                    }
                  }} />
                    </th>
                     <th className="p-4 text-left font-medium">ASIN</th>
                     <th className="p-4 text-left font-medium">Serial Number</th>
                     <th className="p-4 text-left font-medium">SKU</th>
                     <th className="p-4 text-left font-medium">Status</th>
                    <th className="p-4 text-left font-medium">Quantity</th>
                    <th className="p-4 text-left font-medium">Date Added</th>
                    <th className="p-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventory.map(item => <tr key={item.id} className="border-b hover:bg-muted/25 transition-colors">
                      <td className="p-4">
                        <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={checked => {
                    const newSelected = new Set(selectedItems);
                    if (checked) {
                      newSelected.add(item.id);
                    } else {
                      newSelected.delete(item.id);
                    }
                    setSelectedItems(newSelected);
                  }} />
                      </td>
                       <td className="p-4 font-mono text-sm">{item.asin}</td>
                       <td className="p-4 font-mono text-sm">{item.serialNumber}</td>
                       <td className="p-4">
                         <SkuEditor 
                           currentSku={item.sku} 
                           onUpdate={(newSku) => updateSku(item.id, newSku)} 
                         />
                       </td>
                       <td className="p-4">
                        <Badge variant={item.status === 'in-stock' ? 'default' : item.status === 'sold' ? 'secondary' : item.status === 'reserved' ? 'outline' : 'destructive'}>
                          {item.status.replace('-', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${item.quantity === 0 ? 'text-red-500' : item.quantity <= 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {item.quantity}
                          </span>
                          {item.quantity <= 5 && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(item.dateAdded).toLocaleDateString()}
                      </td>
                       <td className="p-4">
                         <div className="flex items-center gap-2">
                            <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)} />
                           <StockHistoryDialog inventoryId={item.id} itemIdentifier={`${item.asin} (${item.serialNumber})`} inventoryType="asin" />
                         </div>
                       </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedInventory.map(item => <Card key={item.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={checked => {
                  const newSelected = new Set(selectedItems);
                  if (checked) {
                    newSelected.add(item.id);
                  } else {
                    newSelected.delete(item.id);
                  }
                  setSelectedItems(newSelected);
                }} />
                      <Badge variant={item.status === 'in-stock' ? 'default' : item.status === 'sold' ? 'secondary' : item.status === 'reserved' ? 'outline' : 'destructive'}>
                        {item.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">ASIN</Label>
                      <p className="font-mono text-sm">{item.asin}</p>
                    </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">Serial Number</Label>
                       <p className="font-mono text-sm">{item.serialNumber}</p>
                     </div>
                     <div>
                       <Label className="text-xs text-muted-foreground">SKU</Label>
                       <SkuEditor 
                         currentSku={item.sku} 
                         onUpdate={(newSku) => updateSku(item.id, newSku)} 
                       />
                     </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${item.quantity === 0 ? 'text-red-500' : item.quantity <= 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {item.quantity}
                        </span>
                        {item.quantity <= 5 && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date Added</Label>
                      <p className="text-sm">{new Date(item.dateAdded).toLocaleDateString()}</p>
                    </div>
                  </div>
                   <div className="flex items-center gap-2">
                     <DualQuantityEditor currentQuantity={item.quantity} onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)} />
                     <StockHistoryDialog inventoryId={item.id} itemIdentifier={`${item.asin} (${item.serialNumber})`} inventoryType="asin" />
                   </div>
                </div>
              </CardContent>
            </Card>)}
        </div>}
        
        {/* Pagination */}
        {filteredInventory.length > itemsPerPage && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length} items
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
    </div>;
}