import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Package, AlertTriangle, TrendingUp, Calendar, CheckCircle, Clock, RefreshCw, ShoppingCart, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';

// Types
interface RestockItem {
  id: string;
  identifier: string;
  current_quantity: number;
  table_name: string;
  status: string;
  date_sold?: string | null;
  last_restock_date?: string | null;
  days_since_last_restock?: number | null;
}

interface AllInventoryItem {
  id: string;
  item_type: 'ASIN';
  asin?: string;
  sku?: string;
  serial_number: string;
  quantity: number;
  status: string;
  last_sold_date?: string | null;
  last_order_date?: string | null;
  days_since_ordered?: number | null;
  date_added: string;
  notes?: string;
}

interface ItemSales {
  id: string;
  identifier: string;
  table_name: string;
  current_quantity: number;
  sold_quantity: number;
  days_since_last_sale: number | null;
  last_sale_date: string | null;
  velocity: number;
  trend: 'up' | 'down' | 'stable';
}

interface ActiveInventoryItem {
  id: string;
  identifier: string;
  current_quantity: number;
  table_name: string;
  status: string;
  days_since_last_restock: number | null;
}

const Replenishment = () => {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  
  // State
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<AllInventoryItem[]>([]);
  const [orderedItems, setOrderedItems] = useState<RestockItem[]>([]);
  const [salesData, setSalesData] = useState<ItemSales[]>([]);
  const [activeInventory, setActiveInventory] = useState<ActiveInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [bulkQuantities, setBulkQuantities] = useState<{ [key: string]: number }>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'quantity' | 'days'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sold' | 'in-stock' | 'ordered'>('all');
  const [salesPeriod, setSalesPeriod] = useState(30);

  // Load items that need restocking
  const loadRestockItems = useCallback(async () => {
    if (!selectedCountry) return;
    
    try {
      setLoading(true);
      console.log('Loading restock items for country:', selectedCountry);
      
      // Get ASIN inventory items that need restocking (quantity = 0 and not ordered)
      const asinQuery = supabase.from('asin_inventory')
        .select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added')
        .eq('country', selectedCountry)
        .eq('quantity', 0)
        .neq('status', 'ordered');
        
      const asinResult = await asinQuery;
      
      if (asinResult.error) throw asinResult.error;
      
      // Process ASIN items only
      const asinItems = (asinResult.data || []).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        current_quantity: item.quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        days_since_last_restock: item.last_restock_date ? 
          Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      }));
      
      const allItems = asinItems;
      console.log('Processed restock items:', allItems);
      setRestockItems(allItems);
      console.log('Set restock items for', selectedCountry, ':', allItems.length, 'items');
    } catch (error: any) {
      console.error('Error loading restock items:', error);
      toast({
        title: "Error",
        description: `Failed to load restock items: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, toast]);

  // Load all inventory for detailed view
  const loadAllInventory = useCallback(async () => {
    if (!selectedCountry) return;
    
    try {
      setLoading(true);
      
      const asinAll = await supabase.from('asin_inventory')
        .select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added, notes')
        .eq('country', selectedCountry);
      
      if (asinAll.error) {
        console.error('ASIN query error:', asinAll.error);
        throw asinAll.error;
      }
      
      // Process ASIN items into AllInventoryItem format (SKU functionality removed)
      const asinItems: AllInventoryItem[] = (asinAll.data || []).map(item => ({
        id: item.id,
        item_type: 'ASIN' as const,
        asin: item.asin,
        sku: item.sku,
        serial_number: item.serial_number,
        quantity: item.quantity,
        status: item.status,
        last_sold_date: item.date_sold,
        last_order_date: item.last_restock_date,
        days_since_ordered: item.last_restock_date ? 
          Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
        date_added: item.date_added,
        notes: item.notes
      }));
      
      const allInventoryItems = asinItems;
      console.log('Processed inventory items:', allInventoryItems);
      console.log('Total items count:', allInventoryItems.length);
      
      // Separate items based on status for the existing logic (convert to RestockItem format)
      const restockNeeded = allInventoryItems
        .filter(item => item.quantity === 0 && item.status !== 'ordered')
        .map(item => ({
          id: item.id,
          identifier: item.item_type === 'ASIN' 
            ? `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}` 
            : `SKU: ${item.sku} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: item.item_type === 'ASIN' ? 'asin_inventory' : 'sku_inventory',
          status: item.status,
          date_sold: item.last_sold_date,
          last_restock_date: item.last_order_date,
          days_since_last_restock: item.days_since_ordered
        }));
        
      const ordered = allInventoryItems
        .filter(item => item.status === 'ordered')
        .map(item => ({
          id: item.id,
          identifier: item.item_type === 'ASIN' 
            ? `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}` 
            : `SKU: ${item.sku} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: item.item_type === 'ASIN' ? 'asin_inventory' : 'sku_inventory',
          status: item.status,
          date_sold: item.last_sold_date,
          last_restock_date: item.last_order_date,
          days_since_last_restock: item.days_since_ordered
        }));
      
      setAllInventoryItems(allInventoryItems);
      setRestockItems(restockNeeded);
      setOrderedItems(ordered);
      
    } catch (error: any) {
      console.error('Error loading all inventory:', error);
      toast({
        title: "Error",
        description: `Failed to load inventory: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, toast]);

  // Load ordered items
  const loadOrderedItems = useCallback(async (): Promise<RestockItem[]> => {
    if (!selectedCountry) return [];
    
    try {
      const asinOrdered = await supabase.from('asin_inventory')
        .select('id, asin, serial_number, quantity, status, sku, last_restock_date, date_sold, date_added')
        .eq('country', selectedCountry)
        .eq('status', 'ordered')
        .eq('quantity', 0);
      
      if (asinOrdered.error) throw asinOrdered.error;
      
      const orderedItemsData = (asinOrdered.data || []).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}`,
        current_quantity: item.quantity,
        table_name: 'asin_inventory',
        status: item.status,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
      }));
      return orderedItemsData;
    } catch (error: any) {
      console.error('Error loading ordered items:', error);
      return [];
    }
  }, [selectedCountry]);

  // Auto-update restocked items that are now in stock
  const updateRestockedItems = useCallback(async () => {
    if (!selectedCountry) return;
    
    try {
      const asinRestocked = await supabase.from('asin_inventory')
        .select('id, asin, serial_number, quantity, status')
        .eq('country', selectedCountry)
        .eq('status', 'ordered')
        .gt('quantity', 0);
      
      if (asinRestocked.error) throw asinRestocked.error;
      
      const asinUpdates = asinRestocked.data?.map(item => 
        supabase.from('asin_inventory')
          .update({ status: 'in-stock' })
          .eq('id', item.id)
      ) || [];

      const allUpdates = [...asinUpdates];
      
      if (allUpdates.length > 0) {
        await Promise.all(allUpdates);
        console.log('Updated', allUpdates.length, 'items from ordered to in-stock');
        
        toast({
          title: "Items Updated",
          description: `${allUpdates.length} items automatically updated to in-stock`,
        });
        
        // Reload data
        loadRestockItems();
        loadAllInventory();
      }
    } catch (error: any) {
      console.error('Error updating restocked items:', error);
    }
  }, [selectedCountry, loadRestockItems, loadAllInventory, toast]);

  // Load sales data for velocity analysis
  const loadSalesData = useCallback(async () => {
    if (!selectedCountry) return;
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - salesPeriod);

      let asinSalesQuery = supabase.from('asin_inventory').select('*').eq('status', 'sold').eq('country', selectedCountry)
        .gte('date_sold', startDate.toISOString());
      let asinRestockQuery = supabase.from('asin_inventory').select('restock_quantity').eq('country', selectedCountry)
        .not('last_restock_date', 'is', null).gte('last_restock_date', startDate.toISOString());
      
      const [asinSalesData, asinRestockData] = await Promise.all([asinSalesQuery, asinRestockQuery]);

      if (asinSalesData.error) throw asinSalesData.error;
      if (asinRestockData.error) throw asinRestockData.error;

      // Calculate sales velocity for ASIN items only
      const salesAnalysis: ItemSales[] = [];
      
      // Process ASIN sales
      const asinSales = asinSalesData.data || [];
      const asinRestock = asinRestockData.data || [];
      const totalAsinRestock = asinRestock.reduce((sum, item) => sum + (item.restock_quantity || 0), 0);

      asinSales.forEach(item => {
        const daysSinceLastSale = item.date_sold ? 
          Math.floor((Date.now() - new Date(item.date_sold).getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        const velocity = salesPeriod > 0 ? (item.quantity || 0) / salesPeriod : 0;
        
        salesAnalysis.push({
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})`,
          table_name: 'asin_inventory',
          current_quantity: 0, // Since it's sold
          sold_quantity: item.quantity || 0,
          days_since_last_sale: daysSinceLastSale,
          last_sale_date: item.date_sold,
          velocity,
          trend: velocity > 0.5 ? 'up' : velocity > 0.2 ? 'stable' : 'down'
        });
      });

      setSalesData(salesAnalysis);
    } catch (error: any) {
      console.error('Error loading sales data:', error);
      toast({
        title: "Error",
        description: `Failed to load sales data: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [selectedCountry, salesPeriod, toast]);

  // Mark items as ordered
  const markAsOrdered = async (items: RestockItem[]) => {
    try {
      setUpdating('bulk');
      
      const updatePromises = items.map(item => {
        const itemId = item.id;
        if (item.table_name === 'asin_inventory') {
          return supabase.from('asin_inventory').update({
            status: 'ordered'
          }).eq('id', itemId);
        }
        // SKU functionality removed
        return Promise.resolve({ error: null });
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} items`);
      }

      toast({
        title: "Success",
        description: `Marked ${items.length} items as ordered`,
      });

      setSelectedItems([]);
      loadRestockItems();
      
    } catch (error: any) {
      console.error('Error marking items as ordered:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  // Restock individual item
  const restockItem = async (item: RestockItem, quantity: number) => {
    try {
      setUpdating(item.id);
      const itemId = item.id;
      let updateResult;

      if (item.table_name === 'asin_inventory') {
        updateResult = await supabase.from('asin_inventory').update({
          quantity: quantity,
          status: quantity > 0 ? 'in-stock' : 'sold',
          last_restock_date: new Date().toISOString(),
          restock_quantity: quantity
        }).eq('id', itemId);
        console.log('ASIN update result:', updateResult);
      }
      // SKU functionality removed

      if (updateResult?.error) {
        throw updateResult.error;
      }

      toast({
        title: "Success",
        description: `Restocked ${item.identifier} with ${quantity} units`,
      });

      loadRestockItems();
      
    } catch (error: any) {
      console.error('Error restocking item:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  // Load active inventory
  const loadActiveInventory = useCallback(async () => {
    if (!selectedCountry) return;
    
    try {
      // Get all active items from ASIN table only (SKU tables removed)
      const asinData = await supabase.from('asin_inventory').select('*').eq('country', selectedCountry).eq('status', 'in-stock');
      if (asinData.error) throw asinData.error;

      const activeItems: ActiveInventoryItem[] = [
        ...(asinData.data || []).map(item => ({
          id: item.id,
          identifier: `${item.asin} (${item.serial_number})`,
          current_quantity: item.quantity,
          table_name: 'asin_inventory',
          status: item.status,
          days_since_last_restock: item.last_restock_date ? Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null
        }))
      ];

      setActiveInventory(activeItems);
    } catch (error: any) {
      console.error('Error loading active inventory:', error);
      toast({
        title: "Error",
        description: `Failed to load active inventory: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [selectedCountry, toast]);

  // Effects
  useEffect(() => {
    if (selectedCountry) {
      loadRestockItems();
      loadAllInventory();
      updateRestockedItems();
      loadSalesData();
      loadActiveInventory();
    }
  }, [selectedCountry, loadRestockItems, loadAllInventory, updateRestockedItems, loadSalesData, loadActiveInventory]);

  // Set up real-time subscriptions for inventory changes
  useEffect(() => {
    if (!selectedCountry) return;

    const asinSubscription = supabase
      .channel('asin_inventory_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'asin_inventory',
        filter: `country=eq.${selectedCountry}`
      }, () => {
        loadRestockItems();
        loadAllInventory();
        loadActiveInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(asinSubscription);
    };
  }, [selectedCountry, loadRestockItems, loadAllInventory, loadActiveInventory]);

  // Utility functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysAgo = (days: number | null) => {
    if (days === null) return 'Never';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      'in-stock': 'default',
      'sold': 'secondary',
      'ordered': 'outline',
      'reserved': 'destructive',
      'damaged': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  // Filter and sort functions
  const getFilteredItems = (items: RestockItem[]) => {
    let filtered = items;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          if (!a.date_sold && !b.date_sold) return 0;
          if (!a.date_sold) return 1;
          if (!b.date_sold) return -1;
          return new Date(b.date_sold).getTime() - new Date(a.date_sold).getTime();
        case 'quantity':
          return a.current_quantity - b.current_quantity;
        case 'days':
          return (b.days_since_last_restock || 0) - (a.days_since_last_restock || 0);
        default:
          return 0;
      }
    });
  };

  const getFilteredInventory = (items: AllInventoryItem[]) => {
    let filtered = items;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
        case 'quantity':
          return b.quantity - a.quantity;
        case 'days':
          return (b.days_since_ordered || 0) - (a.days_since_ordered || 0);
        default:
          return 0;
      }
    });
  };

  // Stats calculations
  const stats = {
    totalNeedingRestock: restockItems.length,
    totalOrdered: orderedItems.length,
    averageDaysToRestock: restockItems.length > 0 
      ? Math.round(restockItems.reduce((sum, item) => sum + (item.days_since_last_restock || 0), 0) / restockItems.length)
      : 0,
    fastMovingItems: salesData.filter(item => item.trend === 'up').length,
    slowMovingItems: salesData.filter(item => item.trend === 'down').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Replenishment</h1>
          <p className="text-muted-foreground">Manage restocking and inventory analysis for {selectedCountry}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadRestockItems} 
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={updateRestockedItems}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Update Restocked
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Need Restock</p>
                <p className="text-2xl font-bold">{stats.totalNeedingRestock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Ordered</p>
                <p className="text-2xl font-bold">{stats.totalOrdered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Avg Days</p>
                <p className="text-2xl font-bold">{stats.averageDaysToRestock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Fast Moving</p>
                <p className="text-2xl font-bold">{stats.fastMovingItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
              <div>
                <p className="text-sm font-medium">Slow Moving</p>
                <p className="text-2xl font-bold">{stats.slowMovingItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="restock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="restock">Need Restock</TabsTrigger>
          <TabsTrigger value="ordered">Ordered Items</TabsTrigger>
          <TabsTrigger value="all">All Inventory</TabsTrigger>
          <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
          <TabsTrigger value="active">Active Inventory</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Label htmlFor="sort">Sort by:</Label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger id="sort" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="quantity">Quantity</SelectItem>
                <SelectItem value="days">Days Since Restock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="filter">Filter:</Label>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger id="filter" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="restock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Items Needing Restock
              </CardTitle>
              <CardDescription>
                Items with 0 quantity that need to be restocked
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedItems.length > 0 && (
                <div className="mb-4">
                  <Button 
                    onClick={() => markAsOrdered(restockItems.filter(item => selectedItems.includes(item.id)))}
                    disabled={updating === 'bulk'}
                  >
                    {updating === 'bulk' ? 'Updating...' : `Mark ${selectedItems.length} items as ordered`}
                  </Button>
                </div>
              )}
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === restockItems.length && restockItems.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(restockItems.map(item => item.id));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Sold</TableHead>
                      <TableHead>Days Since Restock</TableHead>
                      <TableHead>Restock Quantity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredItems(restockItems).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.identifier}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatDate(item.date_sold)}</TableCell>
                        <TableCell>{getDaysAgo(item.days_since_last_restock)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="Qty"
                            className="w-20"
                            value={bulkQuantities[item.id] || ''}
                            onChange={(e) => setBulkQuantities(prev => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0
                            }))}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => restockItem(item, bulkQuantities[item.id] || 1)}
                              disabled={updating === item.id || !bulkQuantities[item.id]}
                            >
                              {updating === item.id ? 'Restocking...' : 'Restock'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {restockItems.length === 0 && !loading && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All items are in stock!</p>
                  <p className="text-muted-foreground">No items need restocking at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ordered" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-blue-500" />
                Ordered Items
              </CardTitle>
              <CardDescription>
                Items that have been ordered and are awaiting delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Sold</TableHead>
                      <TableHead>Days Since Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.identifier}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatDate(item.date_sold)}</TableCell>
                        <TableCell>{getDaysAgo(item.days_since_last_restock)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {orderedItems.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No ordered items</p>
                  <p className="text-muted-foreground">No items are currently on order.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                All Inventory Items
              </CardTitle>
              <CardDescription>
                Complete inventory overview for {selectedCountry}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Days Since Last Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredInventory(allInventoryItems).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">{item.item_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.item_type === 'ASIN' 
                            ? `${item.asin} (${item.serial_number})${item.sku ? ` | SKU: ${item.sku}` : ''}` 
                            : `SKU: ${item.sku} (${item.serial_number})`
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.quantity > 0 ? 'default' : 'destructive'}>
                            {item.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatDate(item.date_added)}</TableCell>
                        <TableCell>{getDaysAgo(item.days_since_ordered)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2" />
                Sales Velocity Analysis
              </CardTitle>
              <CardDescription>
                Analyze sales patterns to optimize restocking decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="salesPeriod">Analysis Period (days):</Label>
                <Input
                  id="salesPeriod"
                  type="number"
                  value={salesPeriod}
                  onChange={(e) => setSalesPeriod(parseInt(e.target.value) || 30)}
                  className="w-32 mt-1"
                />
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Sold Quantity</TableHead>
                      <TableHead>Velocity (units/day)</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Last Sale</TableHead>
                      <TableHead>Days Since Sale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.identifier}</TableCell>
                        <TableCell>{item.sold_quantity}</TableCell>
                        <TableCell>{item.velocity.toFixed(3)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTrendIcon(item.trend)}
                            <span className="capitalize">{item.trend}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.last_sale_date)}</TableCell>
                        <TableCell>{getDaysAgo(item.days_since_last_sale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {salesData.length === 0 && !loading && (
                <div className="text-center py-8">
                  <BarChart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No sales data</p>
                  <p className="text-muted-foreground">No sales found for the selected period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-green-500" />
                Active Inventory
              </CardTitle>
              <CardDescription>
                Items currently in stock and available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Current Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Days Since Restock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.identifier}</TableCell>
                        <TableCell>
                          <Badge variant="default">{item.current_quantity}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{getDaysAgo(item.days_since_last_restock)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {activeInventory.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No active inventory</p>
                  <p className="text-muted-foreground">No items are currently in stock.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Replenishment;