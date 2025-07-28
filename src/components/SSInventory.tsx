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
import { useToast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Package, Plus, Search, Edit, Download, Upload, Check, X, RefreshCw, AlertTriangle, Printer, Hash, Mail, BarChart3, Filter, Grid3X3, List, SortAsc, SortDesc, Calendar, TrendingUp, TrendingDown, Eye, Archive, Zap, Clock, ShoppingCart, Trash2, Settings, FileText, Copy, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DualQuantityEditor } from './DualQuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';
import { SkuInventoryMetrics } from './SkuInventoryMetrics';

export function SSInventory() {
  const {
    inventory,
    loading,
    addItem,
    updateItemStatus,
    bulkAdd,
    updateQuantity,
    updateBinLocation,
    refetch
  } = useSkuInventory();
  const {
    user
  } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'skuNumber' | 'quantity' | 'status'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [isBulkQuantityDialogOpen, setIsBulkQuantityDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<SkuInventoryItem['status']>('in-stock');
  const [bulkQuantityValue, setBulkQuantityValue] = useState(1);
  const [bulkQuantityReason, setBulkQuantityReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [quickFilter, setQuickFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'recent'>('all');
  const {
    toast
  } = useToast();

  // Form states - keeping SKU-specific fields
  const [newItem, setNewItem] = useState<{
    skuNumber: string;
    binSerialNumber: string;
    status: SkuInventoryItem['status'];
    quantity: number;
  }>({
    skuNumber: '',
    binSerialNumber: '',
    status: 'in-stock',
    quantity: 1
  });
  const [bulkText, setBulkText] = useState('');

  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    // Apply search filter
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      filtered = filtered.filter(item => 
        searchTerms.every(term => 
          item.skuNumber.toLowerCase().includes(term) || 
          item.binSerialNumber.toLowerCase().includes(term)
        )
      );
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
  }, [inventory, searchTerm, statusFilter, sortBy, sortOrder, quickFilter]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const handleAddItem = async () => {
    if (!newItem.skuNumber.trim() || !newItem.binSerialNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "SKU Number and Bin/Serial Number are required",
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
      skuNumber: '',
      binSerialNumber: '',
      status: 'in-stock',
      quantity: 1
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
      if (parts.length >= 3) {
        items.push({
          skuNumber: parts[0].trim(),
          binSerialNumber: parts[1].trim(),
          status: parts[2].trim() as SkuInventoryItem['status'],
          quantity: parseInt(parts[3]) || 1,
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
    const csvData = [
      ['SKU Number', 'Bin/Serial Number', 'Status', 'Quantity', 'Date Added'],
      ...filteredInventory.map(item => [
        item.skuNumber,
        item.binSerialNumber,
        item.status,
        item.quantity.toString(),
        new Date(item.dateAdded).toLocaleDateString()
      ])
    ];
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sku-inventory-${new Date().toISOString().split('T')[0]}.csv`);
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
        <SkuInventoryMetrics />
      </div>

      {/* Prominent Search Bar */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Enhanced Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
              <Input 
                placeholder="🔍 Advanced search: SKU Number, Bin/Serial Number (use spaces for multiple terms)..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-14 h-16 text-xl font-medium shadow-lg border-2 border-primary/60 focus:border-primary ring-2 ring-primary/10 focus:ring-primary/20 bg-background/50" 
              />
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
                        Add New SKU Item
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="skuNumber">SKU Number</Label>
                        <Input 
                          id="skuNumber" 
                          value={newItem.skuNumber} 
                          onChange={e => setNewItem({
                            ...newItem,
                            skuNumber: e.target.value
                          })} 
                          placeholder="Enter SKU Number..." 
                        />
                      </div>
                      <div>
                        <Label htmlFor="binSerialNumber">Bin/Serial Number</Label>
                        <Input 
                          id="binSerialNumber" 
                          value={newItem.binSerialNumber} 
                          onChange={e => setNewItem({
                            ...newItem,
                            binSerialNumber: e.target.value
                          })} 
                          placeholder="Enter Bin/Serial Number..." 
                        />
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input 
                          id="quantity" 
                          type="number" 
                          min="1" 
                          value={newItem.quantity} 
                          onChange={e => setNewItem({
                            ...newItem,
                            quantity: parseInt(e.target.value) || 1
                          })} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={newItem.status} 
                          onValueChange={(value: SkuInventoryItem['status']) => setNewItem({
                            ...newItem,
                            status: value
                          })}
                        >
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
                      <DialogTitle>Bulk Add SKU Items</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bulkText">
                          Paste tab-separated data (SKU Number, Bin/Serial Number, Status, Quantity)
                        </Label>
                        <Textarea 
                          id="bulkText" 
                          value={bulkText} 
                          onChange={e => setBulkText(e.target.value)} 
                          placeholder="SKU001	BIN001	in-stock	5&#10;SKU002	BIN002	sold	1" 
                          rows={8} 
                          className="font-mono text-sm" 
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Format:</strong> Each line should contain tab-separated values</p>
                        <p><strong>Order:</strong> SKU Number → Bin/Serial Number → Status → Quantity</p>
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
              <Button 
                variant={quickFilter === 'all' ? 'default' : 'outline'} 
                size="lg" 
                onClick={() => setQuickFilter('all')} 
                className="flex items-center gap-2"
              >
                <Package className="w-5 h-5" />
                All Items
              </Button>
              <Button 
                variant={quickFilter === 'low-stock' ? 'default' : 'outline'} 
                size="lg" 
                onClick={() => setQuickFilter('low-stock')} 
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Low Stock
              </Button>
              <Button 
                variant={quickFilter === 'out-of-stock' ? 'default' : 'outline'} 
                size="lg" 
                onClick={() => setQuickFilter('out-of-stock')} 
                className="flex items-center gap-2"
              >
                <AlertTriangle className="w-5 h-5" />
                Out of Stock
              </Button>
              <Button 
                variant={quickFilter === 'recent' ? 'default' : 'outline'} 
                size="lg" 
                onClick={() => setQuickFilter('recent')} 
                className="flex items-center gap-2"
              >
                <Clock className="w-5 h-5" />
                Recent (7 days)
              </Button>
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Status Filter */}
              <div className="flex items-center gap-3">
                <Label htmlFor="statusFilter" className="font-semibold flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Status:
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-3">
                <Label className="font-semibold flex items-center gap-2">
                  <SortAsc className="w-5 h-5" />
                  Sort:
                </Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateAdded">Date Added</SelectItem>
                    <SelectItem value="skuNumber">SKU Number</SelectItem>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <Label className="font-semibold">View:</Label>
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {filteredInventory.length} of {inventory.length} items
                </Badge>
                {selectedItems.size > 0 && (
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {selectedItems.size} selected
                  </Badge>
                )}
              </div>
              
              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="flex gap-2">
                  <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Bulk Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Status for {selectedItems.size} items</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select value={bulkStatusValue} onValueChange={(value: SkuInventoryItem['status']) => setBulkStatusValue(value)}>
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
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkStatusDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => {
                          selectedItems.forEach(id => updateItemStatus(id, bulkStatusValue));
                          setSelectedItems(new Set());
                          setIsBulkStatusDialogOpen(false);
                        }}>
                          Update Status
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBulkQuantityDialogOpen} onOpenChange={setIsBulkQuantityDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Hash className="w-4 h-4 mr-2" />
                        Bulk Quantity
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Quantity for {selectedItems.size} items</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bulkQuantity">New Quantity</Label>
                          <Input
                            id="bulkQuantity"
                            type="number"
                            min="0"
                            value={bulkQuantityValue}
                            onChange={e => setBulkQuantityValue(parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bulkReason">Reason (optional)</Label>
                          <Input
                            id="bulkReason"
                            value={bulkQuantityReason}
                            onChange={e => setBulkQuantityReason(e.target.value)}
                            placeholder="e.g., Inventory adjustment, Stock recount..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkQuantityDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => {
                          selectedItems.forEach(id => updateQuantity(id, bulkQuantityValue, bulkQuantityReason || 'Bulk quantity update'));
                          setSelectedItems(new Set());
                          setIsBulkQuantityDialogOpen(false);
                          setBulkQuantityValue(1);
                          setBulkQuantityReason('');
                        }}>
                          Update Quantity
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Display */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
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
                  <th className="p-4 text-left font-semibold">SKU Number</th>
                  <th className="p-4 text-left font-semibold">Bin/Serial Number</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Quantity</th>
                  <th className="p-4 text-left font-semibold">Date Added</th>
                  <th className="p-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInventory.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
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
                    <td className="p-4 font-medium">{item.skuNumber}</td>
                    <td className="p-4">{item.binSerialNumber}</td>
                    <td className="p-4">
                      <Select
                        value={item.status}
                        onValueChange={(value: SkuInventoryItem['status']) => updateItemStatus(item.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-stock">In Stock</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <DualQuantityEditor
                        currentQuantity={item.quantity}
                        onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)}
                      />
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(item.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                         <StockHistoryDialog inventoryId={item.id} itemIdentifier={item.skuNumber} inventoryType="sku" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateBinLocation(item.id, prompt('Enter new bin location:') || item.binSerialNumber)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedInventory.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
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
                  <Badge variant={item.quantity === 0 ? 'destructive' : item.quantity <= 5 ? 'secondary' : 'default'}>
                    {item.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{item.skuNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Bin/Serial Number</Label>
                  <p className="font-medium">{item.binSerialNumber}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <DualQuantityEditor
                      currentQuantity={item.quantity}
                      onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Date Added</Label>
                  <p className="text-sm">{new Date(item.dateAdded).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <StockHistoryDialog inventoryId={item.id} itemIdentifier={item.skuNumber} inventoryType="sku" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateBinLocation(item.id, prompt('Enter new bin location:') || item.binSerialNumber)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="itemsPerPage" className="text-sm font-medium">
                Items per page:
              </Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length} results
              </span>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </Card>
      )}
    </div>;
}
