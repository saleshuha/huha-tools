import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { useInventoryAnalytics } from '@/hooks/useInventoryAnalytics';
import { InventoryAnalytics } from './InventoryAnalytics';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { AlertTriangle, Package, Download, RefreshCw, Search, Clock, ShoppingCart, Target, Plus, Minus } from 'lucide-react';

interface RestockItem {
  id: string;
  identifier: string;
  current_quantity: number;
  table_name: string;
  days_since_last_restock: number | null;
  status: string;
  date_sold?: string | null;
  last_restock_date?: string | null;
  restock_quantity?: number | null;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_quantity?: number;
}

export function Replenishment() {
  const { selectedCountry } = useCountry();
  const {
    inventoryMetrics,
    loading: analyticsLoading,
    loadAnalytics
  } = useInventoryAnalytics();
  
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [filteredRestockItems, setFilteredRestockItems] = useState<RestockItem[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  // Load restock items that need attention
  const loadRestockItems = async () => {
    try {
      setLoading(true);
      console.log('Loading restock items for country:', selectedCountry);
      
      // Get ASIN inventory items that need restocking (low quantity or out of stock)
      const asinQuery = supabase
        .from('asin_inventory')
        .select('*')
        .or('quantity.lte.5,status.eq.out-of-stock');
      
      if (selectedCountry && selectedCountry !== 'ALL' as any) {
        asinQuery.eq('country', selectedCountry);
      }
      const { data: asinData, error: asinError } = await asinQuery;
      
      if (asinError) throw asinError;

      // Get SKU inventory items that need restocking  
      const skuQuery = supabase
        .from('sku_inventory')
        .select('*')
        .or('quantity.lte.5,status.eq.out-of-stock');
        
      if (selectedCountry && selectedCountry !== 'ALL' as any) {
        skuQuery.eq('country', selectedCountry);
      }
      const { data: skuData, error: skuError } = await skuQuery;
      
      if (skuError) throw skuError;

      // Transform and combine data with urgency levels
      const items: RestockItem[] = [
        ...(asinData || []).map(item => {
          const quantity = item.quantity || 0;
          let urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
          let recommendedQuantity = 10;
          
          if (quantity === 0) {
            urgencyLevel = 'critical';
            recommendedQuantity = 20;
          } else if (quantity <= 2) {
            urgencyLevel = 'high';
            recommendedQuantity = 15;
          } else if (quantity <= 5) {
            urgencyLevel = 'medium';
            recommendedQuantity = 10;
          } else {
            urgencyLevel = 'low';
            recommendedQuantity = 5;
          }

          return {
            id: item.id,
            identifier: item.asin || 'Unknown ASIN',
            current_quantity: quantity,
            table_name: 'asin_inventory',
            days_since_last_restock: item.last_restock_date ? 
              Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
            status: item.status || 'unknown',
            date_sold: item.date_sold,
            last_restock_date: item.last_restock_date,
            restock_quantity: item.restock_quantity,
            urgency_level: urgencyLevel,
            recommended_quantity: recommendedQuantity
          };
        }),
        ...(skuData || []).map(item => {
          const quantity = item.quantity || 0;
          let urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
          let recommendedQuantity = 10;
          
          if (quantity === 0) {
            urgencyLevel = 'critical';
            recommendedQuantity = 20;
          } else if (quantity <= 2) {
            urgencyLevel = 'high';
            recommendedQuantity = 15;
          } else if (quantity <= 5) {
            urgencyLevel = 'medium';
            recommendedQuantity = 10;
          } else {
            urgencyLevel = 'low';
            recommendedQuantity = 5;
          }

          return {
            id: item.id,
            identifier: item.sku_number || 'Unknown SKU',
            current_quantity: quantity,
            table_name: 'sku_inventory',
            days_since_last_restock: item.last_restock_date ? 
              Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
            status: item.status || 'unknown',
            date_sold: item.date_sold,
            last_restock_date: item.last_restock_date,
            restock_quantity: item.restock_quantity,
            urgency_level: urgencyLevel,
            recommended_quantity: recommendedQuantity
          };
        })
      ];

      setRestockItems(items);
      console.log(`Loaded ${items.length} restock items`);
      
    } catch (error) {
      console.error('Error loading restock items:', error);
      toast({
        title: "Error",
        description: "Failed to load restock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter restock items based on search and urgency
  useEffect(() => {
    let filtered = [...restockItems];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.identifier.toLowerCase().includes(searchLower)
      );
    }

    // Apply urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(item => item.urgency_level === urgencyFilter);
    }

    // Sort by urgency level (critical first)
    filtered.sort((a, b) => {
      const urgencyOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level];
    });

    setFilteredRestockItems(filtered);
  }, [restockItems, searchTerm, urgencyFilter]);

  // Load data on mount and country change
  useEffect(() => {
    loadRestockItems();
    loadAnalytics(selectedCountry);
  }, [selectedCountry]);

  // Handle restock action
  const handleRestock = async (item: RestockItem, quantity: number) => {
    try {
      if (item.table_name === 'asin_inventory') {
        const { error } = await supabase
          .from('asin_inventory')
          .update({ 
            quantity: item.current_quantity + quantity,
            last_restock_date: new Date().toISOString(),
            restock_quantity: quantity
          })
          .eq('id', item.id);

        if (error) throw error;
      } else if (item.table_name === 'sku_inventory') {
        const { error } = await supabase
          .from('sku_inventory')
          .update({ 
            quantity: item.current_quantity + quantity,
            last_restock_date: new Date().toISOString(),
            restock_quantity: quantity
          })
          .eq('id', item.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Restocked ${quantity} units for ${item.identifier}`,
      });

      // Reload data
      loadRestockItems();
    } catch (error) {
      console.error('Error restocking item:', error);
      toast({
        title: "Error",
        description: "Failed to restock item",
        variant: "destructive",
      });
    }
  };

  // Export filtered restock data
  const exportRestockData = () => {
    const csvData = filteredRestockItems.map(item => ({
      Identifier: item.identifier,
      Type: item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU',
      'Current Quantity': item.current_quantity,
      'Urgency Level': item.urgency_level,
      'Recommended Quantity': item.recommended_quantity,
      'Days Since Restock': item.days_since_last_restock || 'Never',
      Status: item.status
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `restock-items-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get urgency badge color
  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Calculate summary statistics
  const criticalCount = restockItems.filter(item => item.urgency_level === 'critical').length;
  const highCount = restockItems.filter(item => item.urgency_level === 'high').length;
  const totalOutOfStock = restockItems.filter(item => item.current_quantity === 0).length;

  return (
    <div className="max-w-[95vw] mx-auto px-4 py-6 space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Items</p>
                <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Need immediate attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-3xl font-bold text-warning">{highCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Requires restocking soon</p>
              </div>
              <Package className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                <p className="text-3xl font-bold text-destructive">{totalOutOfStock}</p>
                <p className="text-xs text-muted-foreground mt-1">Zero quantity items</p>
              </div>
              <Target className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container hover-scale">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-3xl font-bold text-primary">{restockItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Items needing restock</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-2 bg-gradient-subtle rounded-xl shadow-elegant">
          <TabsTrigger value="sales" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">
            📊 Sales Analytics
          </TabsTrigger>
          <TabsTrigger value="restock" className="text-sm font-semibold px-6 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:bg-white/10">
            📦 Restock Management
          </TabsTrigger>
        </TabsList>

        {/* Sales Analytics Tab */}
        <TabsContent value="sales" className="space-y-6">
          <InventoryAnalytics />
        </TabsContent>

        {/* Restock Management Tab */}
        <TabsContent value="restock" className="space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Restock Management
                  </CardTitle>
                  <p className="text-muted-foreground">Manage inventory items that need restocking</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadRestockItems}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportRestockData}
                    disabled={filteredRestockItems.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading restock items...</span>
                </div>
              ) : (
                <>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search by identifier..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={urgencyFilter} onValueChange={(value: any) => setUrgencyFilter(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Urgency Levels</SelectItem>
                        <SelectItem value="critical">Critical Only</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Results Summary */}
                  <div className="text-sm text-muted-foreground mb-4">
                    Showing {filteredRestockItems.length} of {restockItems.length} items
                    {urgencyFilter !== 'all' && ` (${urgencyFilter} priority)`}
                  </div>

                  {/* Restock Items Grid */}
                  {filteredRestockItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">No items need restocking</p>
                      <p className="text-sm text-muted-foreground">All inventory levels are sufficient</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRestockItems.map((item) => (
                        <Card key={item.id} className="border border-border/50 hover:border-primary/30 transition-colors">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg truncate">
                                    {item.identifier}
                                  </h3>
                                  <Badge variant={getUrgencyBadgeVariant(item.urgency_level)}>
                                    {item.urgency_level}
                                  </Badge>
                                  <Badge variant="outline">
                                    {item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU'}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Current Stock:</span>
                                    <p className="font-medium">{item.current_quantity} units</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Recommended:</span>
                                    <p className="font-medium text-primary">{item.recommended_quantity} units</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Last Restock:</span>
                                    <p className="font-medium">
                                      {item.last_restock_date 
                                        ? format(new Date(item.last_restock_date), 'MMM dd')
                                        : 'Never'
                                      }
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Days Ago:</span>
                                    <p className="font-medium">
                                      {item.days_since_last_restock || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  size="sm"
                                  onClick={() => handleRestock(item, item.recommended_quantity || 10)}
                                  className="whitespace-nowrap"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Restock {item.recommended_quantity}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestock(item, 5)}
                                  className="whitespace-nowrap"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  +5
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}