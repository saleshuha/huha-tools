import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Download,
  Upload,
  Check,
  X,
  Hash,
  RefreshCw,
  Mail,
  BarChart3,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  TrendingUp,
  TrendingDown,
  Eye,
  Archive,
  Zap,
  Clock,
  ShoppingCart,
  Trash2,
  Settings,
  FileText,
  Copy,
  Star,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { useSkuInventory, SkuInventoryItem } from '@/hooks/useSkuInventory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { QuantityEditor } from './QuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';
import { Textarea } from './ui/textarea';

export function SSInventory() {
  const { inventory, loading, addItem, updateItemStatus, updateQuantity, bulkAdd, updateBinLocation, refetch } = useSkuInventory();
  const { user } = useUserProfile();
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
  const { toast } = useToast();

  // Form states
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

  const handleAddItem = async () => {
    if (!newItem.skuNumber.trim() || !newItem.binSerialNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "SKU Number and Bin/Serial Number are required",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate SKU number
    const exists = inventory.some(item => item.skuNumber === newItem.skuNumber.trim());
    if (exists) {
      toast({
        title: "Duplicate SKU Number",
        description: "This SKU number already exists in inventory",
        variant: "destructive"
      });
      return;
    }

    await addItem({
      skuNumber: newItem.skuNumber.trim(),
      binSerialNumber: newItem.binSerialNumber.trim(),
      status: newItem.status,
      dateAdded: new Date().toISOString(),
      quantity: newItem.quantity
    });

    setNewItem({ skuNumber: '', binSerialNumber: '', status: 'in-stock', quantity: 1 });
    setIsAddDialogOpen(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      toast({
        title: "No Data",
        description: "Please enter items to add",
        variant: "destructive"
      });
      return;
    }

    const lines = bulkText.trim().split('\n');
    const newItems: Omit<SkuInventoryItem, 'id'>[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split('\t');
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Invalid format (need SKU Number and Bin/Serial Number)`);
        return;
      }

      const [skuNumber, binSerialNumber, status = 'in-stock', quantity = '1'] = parts;
      
      if (!skuNumber.trim() || !binSerialNumber.trim()) {
        errors.push(`Line ${index + 1}: SKU Number and Bin/Serial Number cannot be empty`);
        return;
      }

      // Check for duplicate SKU number
      const exists = inventory.some(item => item.skuNumber === skuNumber.trim()) ||
                    newItems.some(item => item.skuNumber === skuNumber.trim());
      if (exists) {
        errors.push(`Line ${index + 1}: Duplicate SKU number ${skuNumber}`);
        return;
      }

      const validStatuses = ['in-stock', 'sold', 'reserved', 'damaged'];
      const itemStatus = validStatuses.includes(status.trim()) ? status.trim() as SkuInventoryItem['status'] : 'in-stock';

      newItems.push({
        skuNumber: skuNumber.trim(),
        binSerialNumber: binSerialNumber.trim(),
        status: itemStatus,
        dateAdded: new Date().toISOString(),
        quantity: parseInt(quantity) || 1
      });
    });

    if (errors.length > 0) {
      toast({
        title: "Bulk Add Errors",
        description: `${errors.length} errors found. Check console for details.`,
        variant: "destructive"
      });
      console.error('Bulk add errors:', errors);
    }

    if (newItems.length > 0) {
      await bulkAdd(newItems);
      setBulkText('');
      setIsBulkDialogOpen(false);
    }
  };

  const exportInventory = () => {
    if (inventory.length === 0) {
      toast({
        title: "No Data",
        description: "No inventory items to export",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = ['SKU Number', 'Bin/Serial Number', 'Status', 'Quantity', 'Date Added'];
    const csvData = [
      csvHeaders,
      ...inventory.map(item => [
        item.skuNumber,
        item.binSerialNumber,
        item.status,
        item.quantity.toString(),
        new Date(item.dateAdded).toLocaleDateString()
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'sku-inventory.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `Exported ${inventory.length} items to CSV`,
    });
  };

  const emailInventory = async () => {
    if (inventory.length === 0) {
      toast({
        title: "No Data",
        description: "No inventory items to email",
        variant: "destructive"
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive"
      });
      return;
    }

    try {
      const csvHeaders = ['SKU Number', 'Bin/Serial Number', 'Status', 'Quantity', 'Date Added'];
      const csvData = [
        csvHeaders,
        ...inventory.map(item => [
          item.skuNumber,
          item.binSerialNumber,
          item.status,
          item.quantity.toString(),
          new Date(item.dateAdded).toLocaleDateString()
        ])
      ];

      const csvContent = csvData.map(row => 
        row.map(field => {
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',')
      ).join('\n');

      toast({
        title: "Sending Email",
        description: "Preparing your inventory export..."
      });

      const { data, error } = await supabase.functions.invoke('send-inventory-email', {
        body: {
          inventoryType: 'sku',
          csvData: csvContent,
          userEmail: user.email
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      toast({
        title: "Email Sent",
        description: `SKU inventory export sent to ${user.email}`
      });
    } catch (error: any) {
      console.error('Email export error:', error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send inventory email",
        variant: "destructive"
      });
    }
  };

  const handleBulkStatusUpdate = async () => {
    try {
      const promises = Array.from(selectedItems).map(id => 
        updateItemStatus(id, bulkStatusValue)
      );
      await Promise.all(promises);
      
      toast({
        title: "Bulk status update successful",
        description: `Updated ${selectedItems.size} items to ${bulkStatusValue}`,
      });
      
      setSelectedItems(new Set());
      setIsBulkStatusDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Bulk status update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkQuantityUpdate = async () => {
    try {
      const promises = Array.from(selectedItems).map(id => 
        updateQuantity(id, bulkQuantityValue, bulkQuantityReason || 'Bulk quantity update')
      );
      await Promise.all(promises);
      
      toast({
        title: "Bulk quantity update successful",
        description: `Updated ${selectedItems.size} items to quantity ${bulkQuantityValue}`,
      });
      
      setSelectedItems(new Set());
      setIsBulkQuantityDialogOpen(false);
      setBulkQuantityValue(1);
      setBulkQuantityReason('');
    } catch (error: any) {
      toast({
        title: "Bulk quantity update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Advanced filtering and analytics
  const { filteredInventory, stats } = useMemo(() => {
    let filtered = inventory.filter(item => {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      
      const matchesSearch = searchTerms.length === 0 || searchTerms.some(term =>
        item.skuNumber.toLowerCase().includes(term) ||
        item.binSerialNumber.toLowerCase().includes(term)
      );
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      const matchesQuickFilter = (() => {
        switch (quickFilter) {
          case 'low-stock': return item.quantity <= 5 && item.quantity > 0;
          case 'out-of-stock': return item.quantity === 0;
          case 'recent': return new Date(item.dateAdded) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          default: return true;
        }
      })();
      
      return matchesSearch && matchesStatus && matchesQuickFilter;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'skuNumber':
          aVal = a.skuNumber.toLowerCase();
          bVal = b.skuNumber.toLowerCase();
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = new Date(a.dateAdded);
          bVal = new Date(b.dateAdded);
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Calculate statistics
    const stats = {
      total: inventory.length,
      inStock: inventory.filter(i => i.status === 'in-stock' && i.quantity > 0).length,
      sold: inventory.filter(i => i.status === 'sold').length,
      lowStock: inventory.filter(i => i.quantity <= 5 && i.quantity > 0).length,
      outOfStock: inventory.filter(i => i.quantity === 0).length,
      totalValue: inventory.reduce((sum, i) => sum + i.quantity, 0),
      recentlyAdded: inventory.filter(i => new Date(i.dateAdded) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
    };

    return { filteredInventory: filtered, stats };
  }, [inventory, searchTerm, statusFilter, quickFilter, sortBy, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: SkuInventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'sold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'reserved': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'damaged': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: SkuInventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return <Package className="w-4 h-4" />;
      case 'sold': return <Check className="w-4 h-4" />;
      case 'reserved': return <Clock className="w-4 h-4" />;
      case 'damaged': return <X className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getQuantityIndicator = (quantity: number) => {
    if (quantity === 0) return { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Out of Stock' };
    if (quantity <= 5) return { color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Low Stock' };
    return { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'In Stock' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading your inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Enhanced Header with Stats */}
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Hash className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SKU Inventory
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Advanced SKU management with real-time analytics
          </p>
        </div>

        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Stock</p>
                  <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sold</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.sold}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="text-2xl font-bold text-cyan-600">{stats.totalValue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recent</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.recentlyAdded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Controls Panel */}
      <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <Tabs defaultValue="filters" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="filters" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="view" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                View
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Actions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quick Filters */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Filters</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={quickFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuickFilter('all')}
                      className="justify-start"
                    >
                      <Hash className="w-4 h-4 mr-2" />
                      All Items
                    </Button>
                    <Button
                      variant={quickFilter === 'low-stock' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuickFilter('low-stock')}
                      className="justify-start"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Low Stock
                    </Button>
                    <Button
                      variant={quickFilter === 'out-of-stock' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuickFilter('out-of-stock')}
                      className="justify-start"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Out of Stock
                    </Button>
                    <Button
                      variant={quickFilter === 'recent' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuickFilter('recent')}
                      className="justify-start"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Recent
                    </Button>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in-stock">In Stock Only</SelectItem>
                      <SelectItem value="sold">Sold Only</SelectItem>
                      <SelectItem value="reserved">Reserved Only</SelectItem>
                      <SelectItem value="damaged">Damaged Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="flex-1">
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
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Advanced search: SKU Number, Bin/Serial Number (use spaces for multiple terms)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Tips:</strong> Use spaces to search multiple terms. Search across SKU Number and Bin/Serial Number.</p>
                  <p>Example: "SKU123 BIN456" will find items containing either "SKU123" or "BIN456"</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="view" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">View Mode:</Label>
                    <div className="flex border rounded-lg p-1">
                      <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className="h-8"
                      >
                        <List className="w-4 h-4 mr-1" />
                        Table
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8"
                      >
                        <Grid3X3 className="w-4 h-4 mr-1" />
                        Grid
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Items per page:</Label>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-24">
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
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(startIndex + 1, filteredInventory.length)}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length} items
                </div>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Add Item */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-12 justify-start bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600">
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
                          onChange={(e) => setNewItem({ ...newItem, skuNumber: e.target.value })}
                          placeholder="Enter SKU Number..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="binSerialNumber">Bin/Serial Number</Label>
                        <Input
                          id="binSerialNumber"
                          value={newItem.binSerialNumber}
                          onChange={(e) => setNewItem({ ...newItem, binSerialNumber: e.target.value })}
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
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={newItem.status}
                          onValueChange={(value: SkuInventoryItem['status']) => setNewItem({ ...newItem, status: value })}
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

                {/* Bulk Add */}
                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-12 justify-start">
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
                          onChange={(e) => setBulkText(e.target.value)}
                          placeholder="SKU001	BIN001	in-stock	10&#10;SKU002	BIN002	sold	1"
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

                {/* Export */}
                <Button
                  variant="outline"
                  onClick={exportInventory}
                  className="h-12 justify-start"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Export CSV
                </Button>

                {/* Email Export */}
                <Button
                  variant="outline"
                  onClick={emailInventory}
                  className="h-12 justify-start"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Email Export
                </Button>

                {/* Refresh */}
                <Button
                  variant="outline"
                  onClick={refetch}
                  className="h-12 justify-start"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bulk Selection Actions */}
      {selectedItems.size > 0 && (
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === paginatedInventory.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems(new Set(paginatedInventory.map(item => item.id)));
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                  />
                  <span className="font-medium">
                    {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Update Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Status Update</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bulkStatus">New Status</Label>
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkStatusDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkStatusUpdate}>Update {selectedItems.size} Items</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isBulkQuantityDialogOpen} onOpenChange={setIsBulkQuantityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Hash className="w-4 h-4 mr-2" />
                      Update Quantity
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Quantity Update</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bulkQuantity">New Quantity</Label>
                        <Input
                          id="bulkQuantity"
                          type="number"
                          min="0"
                          value={bulkQuantityValue}
                          onChange={(e) => setBulkQuantityValue(parseInt(e.target.value) || 0)}
                          placeholder="Enter new quantity"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bulkQuantityReason">Reason (Optional)</Label>
                        <Textarea
                          id="bulkQuantityReason"
                          value={bulkQuantityReason}
                          onChange={(e) => setBulkQuantityReason(e.target.value)}
                          placeholder="Enter reason for quantity change..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkQuantityDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkQuantityUpdate}>Update {selectedItems.size} Items</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Display */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
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
                    <th className="p-4 text-left font-medium">SKU Number</th>
                    <th className="p-4 text-left font-medium">Bin/Serial Number</th>
                    <th className="p-4 text-left font-medium">Status</th>
                    <th className="p-4 text-left font-medium">Quantity</th>
                    <th className="p-4 text-left font-medium">Date Added</th>
                    <th className="p-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventory.map((item) => {
                    const quantityIndicator = getQuantityIndicator(item.quantity);
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/25 transition-colors">
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
                        <td className="p-4">
                          <div className="font-mono font-medium">{item.skuNumber}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono">{item.binSerialNumber}</div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${getStatusColor(item.status)} border-0`}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(item.status)}
                              {item.status}
                            </div>
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded-md text-sm font-medium ${quantityIndicator.bg} ${quantityIndicator.color}`}>
                              {item.quantity}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(item.dateAdded).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <QuantityEditor
                              itemId={item.id}
                              currentQuantity={item.quantity}
                              onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)}
                            />
                            <StockHistoryDialog
                              inventoryType="sku"
                              inventoryId={item.id}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedInventory.map((item) => {
            const quantityIndicator = getQuantityIndicator(item.quantity);
            return (
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
                        <div className={`p-2 rounded-lg ${quantityIndicator.bg}`}>
                          <Hash className={`w-5 h-5 ${quantityIndicator.color}`} />
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(item.status)} border-0`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          {item.status}
                        </div>
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">SKU Number</p>
                        <p className="font-mono font-bold text-lg">{item.skuNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bin/Serial Number</p>
                        <p className="font-mono">{item.binSerialNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${quantityIndicator.bg} ${quantityIndicator.color}`}>
                          {item.quantity} units
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Added</p>
                        <p className="text-sm">{new Date(item.dateAdded).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <QuantityEditor
                        itemId={item.id}
                        currentQuantity={item.quantity}
                        onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)}
                      />
                      <StockHistoryDialog
                        inventoryType="sku"
                        inventoryId={item.id}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-muted inline-block">
                <Hash className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No inventory items found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || quickFilter !== 'all'
                    ? 'Try adjusting your filters or search terms'
                    : 'Get started by adding your first SKU item'
                  }
                </p>
              </div>
              {!searchTerm && statusFilter === 'all' && quickFilter === 'all' && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Item
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}