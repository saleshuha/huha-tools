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
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Download, 
  Upload,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Printer,
  Hash,
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
  Star
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { QuantityEditor } from './QuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';

export function AsinInventory() {
  const { inventory, loading, addItem, updateItemStatus, bulkAdd, restockItem, updateQuantity, updateBin, refetch } = useAsinInventory();
  const { user } = useUserProfile();
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
  const { toast } = useToast();

  const updateItemBin = async (id: string, binLocation: string) => {
    if (updateBin) {
      await updateBin(id, binLocation);
    }
  };

  const handleRestock = async () => {
    if (restockQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    await restockItem(restockItemId, restockQuantity);
    setRestockDialogOpen(false);
    setRestockItemId('');
    setRestockQuantity(1);
  };

  // Form states
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    status: AsinInventoryItem['status'];
    quantity: number;
    notes?: string;
  }>({
    asin: '',
    serialNumber: '',
    status: 'in-stock',
    quantity: 1,
    notes: ''
  });
  const [bulkText, setBulkText] = useState('');
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockItemId, setRestockItemId] = useState<string>('');
  const [restockQuantity, setRestockQuantity] = useState<number>(1);

  const handleAddItem = async () => {
    if (!newItem.asin.trim() || !newItem.serialNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "ASIN and Serial Number are required",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate serial number
    const exists = inventory.some(item => item.serialNumber === newItem.serialNumber.trim());
    if (exists) {
      toast({
        title: "Duplicate Serial Number",
        description: "This serial number already exists in inventory",
        variant: "destructive"
      });
      return;
    }

    await addItem({
      asin: newItem.asin.trim(),
      serialNumber: newItem.serialNumber.trim(),
      status: newItem.status,
      dateAdded: new Date().toISOString(),
      quantity: newItem.quantity,
      notes: newItem.notes?.trim()
    });

    setNewItem({ asin: '', serialNumber: '', status: 'in-stock', quantity: 1, notes: '' });
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
    const newItems: Omit<AsinInventoryItem, 'id'>[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split('\t');
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Invalid format (need ASIN and Serial Number)`);
        return;
      }

      const [asin, serialNumber, status = 'in-stock', quantity = '1', notes = ''] = parts;
      
      if (!asin.trim() || !serialNumber.trim()) {
        errors.push(`Line ${index + 1}: ASIN and Serial Number cannot be empty`);
        return;
      }

      // Check for duplicate serial number
      const exists = inventory.some(item => item.serialNumber === serialNumber.trim()) ||
                    newItems.some(item => item.serialNumber === serialNumber.trim());
      if (exists) {
        errors.push(`Line ${index + 1}: Duplicate serial number ${serialNumber}`);
        return;
      }

      const validStatuses = ['in-stock', 'sold', 'reserved', 'damaged'];
      const itemStatus = validStatuses.includes(status.trim()) ? status.trim() as AsinInventoryItem['status'] : 'in-stock';

      newItems.push({
        asin: asin.trim(),
        serialNumber: serialNumber.trim(),
        status: itemStatus,
        dateAdded: new Date().toISOString(),
        quantity: parseInt(quantity) || 1,
        notes: notes.trim()
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

    const csvHeaders = ['Serial Number', 'ASIN', 'Status', 'Date Added', 'Date Sold', 'Quantity', 'Last Restock Date', 'Notes'];
    const csvData = [
      csvHeaders,
      ...inventory.map(item => [
        item.serialNumber,
        item.asin,
        item.status,
        new Date(item.dateAdded).toLocaleDateString(),
        item.dateSold ? new Date(item.dateSold).toLocaleDateString() : '',
        item.quantity.toString(),
        item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : '',
        item.notes || ''
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
      link.setAttribute('download', 'asin-inventory.csv');
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
      const csvHeaders = ['Serial Number', 'ASIN', 'Status', 'Date Added', 'Date Sold', 'Quantity', 'Last Restock Date', 'Notes'];
      const csvData = [
        csvHeaders,
        ...inventory.map(item => [
          item.serialNumber,
          item.asin,
          item.status,
          new Date(item.dateAdded).toLocaleDateString(),
          item.dateSold ? new Date(item.dateSold).toLocaleDateString() : '',
          item.quantity.toString(),
          item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : '',
          item.notes || ''
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
          inventoryType: 'asin',
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
        description: `ASIN inventory export sent to ${user.email}`
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

  // Handle bulk status update
  const handleBulkStatusUpdate = async () => {
    try {
      const promises = Array.from(selectedItems).map(id => 
        updateItemStatus(id, bulkStatusValue)
      );
      await Promise.all(promises);
      
      toast({
        title: "Bulk update successful",
        description: `Updated ${selectedItems.size} items to ${bulkStatusValue}`,
      });
      
      setSelectedItems(new Set());
      setIsBulkStatusDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Bulk update failed",
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
        item.asin.toLowerCase().includes(term) ||
        item.serialNumber.toLowerCase().includes(term) ||
        item.notes?.toLowerCase().includes(term)
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
        case 'asin':
          aVal = a.asin.toLowerCase();
          bVal = b.asin.toLowerCase();
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

  const getStatusColor = (status: AsinInventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'sold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'reserved': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'damaged': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: AsinInventoryItem['status']) => {
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
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              ASIN Inventory
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Advanced inventory management with real-time analytics
          </p>
        </div>

        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 auto-fit-columns">
          <Card className="hover:shadow-lg transition-all duration-300 min-w-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                  <Package className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Total</p>
                  <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 min-w-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">In Stock</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">{stats.inStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 min-w-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Low Stock</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 min-w-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                  <X className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Out of Stock</p>
                  <p className="text-lg md:text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 min-w-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Sold</p>
                  <p className="text-lg md:text-2xl font-bold text-purple-600">{stats.sold}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 min-w-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex-shrink-0">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Total Units</p>
                  <p className="text-lg md:text-2xl font-bold text-cyan-600">{stats.totalValue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 min-w-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Recent</p>
                  <p className="text-lg md:text-2xl font-bold text-indigo-600">{stats.recentlyAdded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prominent Search Bar */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Enhanced Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
              <Input
                placeholder="🔍 Advanced search: ASIN, Serial Number, Notes (use spaces for multiple terms)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 h-16 text-xl font-medium shadow-lg border-2 focus:border-primary/50 bg-background/50"
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
                        Add New ASIN Item
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="asin">ASIN</Label>
                        <Input
                          id="asin"
                          value={newItem.asin}
                          onChange={(e) => setNewItem({ ...newItem, asin: e.target.value })}
                          placeholder="Enter ASIN..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="serialNumber">Serial Number</Label>
                        <Input
                          id="serialNumber"
                          value={newItem.serialNumber}
                          onChange={(e) => setNewItem({ ...newItem, serialNumber: e.target.value })}
                          placeholder="Enter Serial Number..."
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
                          onValueChange={(value: AsinInventoryItem['status']) => setNewItem({ ...newItem, status: value })}
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
                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
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
                          Paste tab-separated data (ASIN, Serial Number, Status, Quantity, Notes)
                        </Label>
                        <Textarea
                          id="bulkText"
                          value={bulkText}
                          onChange={(e) => setBulkText(e.target.value)}
                          placeholder="B123456789	SN001	in-stock	5	Optional notes&#10;B987654321	SN002	sold	1	Another item"
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Format:</strong> Each line should contain tab-separated values</p>
                        <p><strong>Order:</strong> ASIN → Serial Number → Status → Quantity → Notes</p>
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

                <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/5">
                  <Download className="w-5 h-5 mr-2" />
                  Export
                </Button>
                <Button size="lg" variant="outline" className="border-blue-300 hover:bg-blue-50">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh
                </Button>
                <Button size="lg" variant="outline" className="border-purple-300 hover:bg-purple-50">
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

              {/* Sort Options */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Sort:</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-32 bg-background border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      <SelectItem value="dateAdded">Date Added</SelectItem>
                      <SelectItem value="asin">ASIN</SelectItem>
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

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">View:</Label>
                <div className="flex border rounded-lg p-1 bg-background">
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

              {/* Items per page */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Show:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
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

            {/* Filters and Controls Row */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background border z-50">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
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
                    <SelectTrigger className="flex-1 bg-background border z-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="dateAdded">Date Added</SelectItem>
                      <SelectItem value="asin">ASIN</SelectItem>
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

              {/* View Mode */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">View Mode</Label>
                <div className="flex border rounded-lg p-1 bg-background">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 flex-1"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 flex-1"
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Grid
                  </Button>
                </div>
              </div>

              {/* Items per page */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Items per page</Label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="bg-background border z-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Results</Label>
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                  {Math.min(startIndex + 1, filteredInventory.length)}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Actions:
                </Label>
                <div className="flex flex-wrap gap-3">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600">
                    <Plus className="w-4 h-4 mr-2" />
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
                        <Input
                          id="asin"
                          value={newItem.asin}
                          onChange={(e) => setNewItem({ ...newItem, asin: e.target.value })}
                          placeholder="Enter ASIN..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="serialNumber">Serial Number</Label>
                        <Input
                          id="serialNumber"
                          value={newItem.serialNumber}
                          onChange={(e) => setNewItem({ ...newItem, serialNumber: e.target.value })}
                          placeholder="Enter Serial Number..."
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
                          onValueChange={(value: AsinInventoryItem['status']) => setNewItem({ ...newItem, status: value })}
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
                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
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

                <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/5">
                  <Download className="w-5 h-5 mr-2" />
                  Export
                </Button>
                <Button size="lg" variant="outline" className="border-blue-300 hover:bg-blue-50">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh
                </Button>
                <Button size="lg" variant="outline" className="border-purple-300 hover:bg-purple-50">
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

              {/* Sort Options */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Sort:</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-32 bg-background border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      <SelectItem value="dateAdded">Date Added</SelectItem>
                      <SelectItem value="asin">ASIN</SelectItem>
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

              {/* View Mode */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">View:</Label>
                <div className="flex border rounded-lg p-1 bg-background">
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

              {/* Items per page */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium whitespace-nowrap">Show:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
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
          </div>
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
                        <Select value={bulkStatusValue} onValueChange={(value: AsinInventoryItem['status']) => setBulkStatusValue(value)}>
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
                    <th className="p-4 text-left font-medium">ASIN</th>
                    <th className="p-4 text-left font-medium">Serial Number</th>
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
                          <div className="font-mono font-medium">{item.asin}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono">{item.serialNumber}</div>
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
                              currentQuantity={item.quantity}
                              onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)}
                            />
                            <StockHistoryDialog
                              inventoryType="asin"
                              inventoryId={item.id}
                              itemIdentifier={`${item.asin} (${item.serialNumber})`}
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
                          <Package className={`w-5 h-5 ${quantityIndicator.color}`} />
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
                        <p className="text-sm text-muted-foreground">ASIN</p>
                        <p className="font-mono font-bold text-lg">{item.asin}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Serial Number</p>
                        <p className="font-mono">{item.serialNumber}</p>
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

                    {item.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{item.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <QuantityEditor
                        currentQuantity={item.quantity}
                        onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)}
                      />
                      <StockHistoryDialog
                        inventoryType="asin"
                        inventoryId={item.id}
                        itemIdentifier={`${item.asin} (${item.serialNumber})`}
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
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No inventory items found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || quickFilter !== 'all'
                    ? 'Try adjusting your filters or search terms'
                    : 'Get started by adding your first ASIN item'
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
}