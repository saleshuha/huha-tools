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

  // Form states
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    status: AsinInventoryItem['status'];
    quantity: number;
    notes: string;
  }>({
    asin: '',
    serialNumber: '',
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
      filtered = filtered.filter(item => 
        searchTerms.every(term =>
          item.asin.toLowerCase().includes(term) ||
          item.serialNumber.toLowerCase().includes(term) ||
          (item.notes && item.notes.toLowerCase().includes(term))
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
      status: 'in-stock',
      quantity: 1,
      notes: ''
    });
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
    <div className="space-y-6 max-w-[95vw] mx-auto p-6">
      {/* Header with Stats */}
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

      {/* Inventory Display */}
      {filteredInventory.length === 0 ? (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No inventory items found</h3>
            <p className="text-muted-foreground text-center mb-6">
              {searchTerm || statusFilter !== 'all' || quickFilter !== 'all' 
                ? "Try adjusting your filters or search terms"
                : "Get started by adding your first inventory item"
              }
            </p>
            {!searchTerm && statusFilter === 'all' && quickFilter === 'all' && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Inventory Items</h3>
                <span className="text-sm text-muted-foreground">
                  Showing {paginatedInventory.length} of {filteredInventory.length} items
                </span>
              </div>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Inventory table view coming soon...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}