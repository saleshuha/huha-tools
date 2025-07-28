import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Search,
  Download,
  FileText,
  RefreshCw,
  Activity,
  BarChart3,
  TrendingDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryItem {
  id: string;
  identifier: string;
  type: 'asin' | 'sku';
  quantity: number;
  status: string;
  date_added: string;
  date_sold?: string;
  country: string;
  serial_number?: string;
  bin_serial_number?: string;
}

interface InventoryStats {
  activeItems: number;
  inStockItems: number;
  outOfStockItems: number;
  asinTotalUnits: number;
  asinSoldUnits: number;
  skuTotalUnits: number;
  skuSoldUnits: number;
}

interface InventoryMetricsProps {
  showOnlyAsin?: boolean;
}

export function InventoryMetrics({ showOnlyAsin = false }: InventoryMetricsProps) {
  const { selectedCountry } = useCountry();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<InventoryStats>({
    activeItems: 0,
    inStockItems: 0,
    outOfStockItems: 0,
    asinTotalUnits: 0,
    asinSoldUnits: 0,
    skuTotalUnits: 0,
    skuSoldUnits: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'active' | 'instock' | 'outofstock' | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      if (showOnlyAsin) {
        // Load only ASIN data
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry);

        const asinItems = asinData || [];
        const activeItems = asinItems.length;
        const inStockItems = asinItems.filter(item => item.quantity > 0).length;
        const outOfStockItems = asinItems.filter(item => item.quantity === 0).length;
        const asinTotalUnits = asinItems.reduce((sum, item) => sum + item.quantity, 0);
        const asinSoldUnits = asinItems.filter(item => item.status === 'sold').reduce((sum, item) => sum + item.quantity, 0);

        setStats({
          activeItems,
          inStockItems,
          outOfStockItems,
          asinTotalUnits,
          asinSoldUnits,
          skuTotalUnits: 0,
          skuSoldUnits: 0
        });
      } else {
        // Load both ASIN and SKU data
        const [asinData, skuData] = await Promise.all([
          supabase
            .from('asin_inventory')
            .select('*')
            .eq('country', selectedCountry),
          supabase
            .from('sku_inventory')
            .select('*')
            .eq('country', selectedCountry)
        ]);

        // Calculate metrics
        const allItems = [
          ...(asinData.data || []).map(item => ({
            ...item,
            type: 'asin' as const,
            identifier: `${item.asin} (${item.serial_number})`
          })),
          ...(skuData.data || []).map(item => ({
            ...item,
            type: 'sku' as const,
            identifier: `${item.sku_number} (${item.bin_serial_number})`
          }))
        ];

        const activeItems = allItems.length;
        const inStockItems = allItems.filter(item => item.quantity > 0).length;
        const outOfStockItems = allItems.filter(item => item.quantity === 0).length;
        
        // Calculate separate totals for ASIN and SKU
        const asinItems = asinData.data || [];
        const skuItems = skuData.data || [];
        
        const asinTotalUnits = asinItems.reduce((sum, item) => sum + item.quantity, 0);
        const asinSoldUnits = asinItems.filter(item => item.status === 'sold').reduce((sum, item) => sum + item.quantity, 0);
        const skuTotalUnits = skuItems.reduce((sum, item) => sum + item.quantity, 0);
        const skuSoldUnits = skuItems.filter(item => item.status === 'sold').reduce((sum, item) => sum + item.quantity, 0);

        setStats({
          activeItems,
          inStockItems,
          outOfStockItems,
          asinTotalUnits,
          asinSoldUnits,
          skuTotalUnits,
          skuSoldUnits
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading metrics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedItems = async (metric: 'active' | 'instock' | 'outofstock') => {
    try {
      if (showOnlyAsin) {
        // Load only ASIN data
        const { data: asinData } = await supabase
          .from('asin_inventory')
          .select('*')
          .eq('country', selectedCountry);

        let allItems = (asinData || []).map(item => ({
          ...item,
          type: 'asin' as const,
          identifier: `${item.asin} (${item.serial_number})`
        }));

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0);
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0);
        }

        setInventoryItems(allItems);
      } else {
        // Load both ASIN and SKU data
        const [asinData, skuData] = await Promise.all([
          supabase
            .from('asin_inventory')
            .select('*')
            .eq('country', selectedCountry),
          supabase
            .from('sku_inventory')
            .select('*')
            .eq('country', selectedCountry)
        ]);

        let allItems = [
          ...(asinData.data || []).map(item => ({
            ...item,
            type: 'asin' as const,
            identifier: `${item.asin} (${item.serial_number})`
          })),
          ...(skuData.data || []).map(item => ({
            ...item,
            type: 'sku' as const,
            identifier: `${item.sku_number} (${item.bin_serial_number})`
          }))
        ];

        // Filter based on metric
        if (metric === 'instock') {
          allItems = allItems.filter(item => item.quantity > 0);
        } else if (metric === 'outofstock') {
          allItems = allItems.filter(item => item.quantity === 0);
        }

        setInventoryItems(allItems);
      }
    } catch (error: any) {
      toast({
        title: "Error loading items",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMetricClick = async (metric: 'active' | 'instock' | 'outofstock') => {
    setSelectedMetric(metric);
    await loadDetailedItems(metric);
  };

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      const exportData = filteredItems.map(item => ({
        'Type': item.type.toUpperCase(),
        'Identifier': item.identifier,
        'Quantity': item.quantity,
        'Status': item.status,
        'Country': item.country,
        'Date Added': new Date(item.date_added).toLocaleDateString(),
        'Date Sold': item.date_sold ? new Date(item.date_sold).toLocaleDateString() : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedMetric}_inventory`);
      
      const filename = `${selectedMetric}_inventory_${selectedCountry}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Export successful",
        description: `Exported ${filteredItems.length} items to ${filename}`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCountry) {
      loadMetrics();
    }
  }, [selectedCountry]);

  const filteredItems = inventoryItems.filter(item =>
    item.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Active Items */}
        <Card 
          className="glass-container cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/30"
          onClick={() => handleMetricClick('active')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Items</p>
                <p className="text-2xl font-bold text-primary">{stats.activeItems}</p>
                <p className="text-xs text-muted-foreground">Total inventory items</p>
              </div>
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* In Stock Items */}
        <Card 
          className="glass-container cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-green-500/30"
          onClick={() => handleMetricClick('instock')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold text-green-600">{stats.inStockItems}</p>
                <p className="text-xs text-muted-foreground">Available for sale</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Out of Stock Items */}
        <Card 
          className="glass-container cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-red-500/30"
          onClick={() => handleMetricClick('outofstock')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
                <p className="text-xs text-muted-foreground">Need restock</p>
              </div>
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ASIN and SKU Units Section */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showOnlyAsin ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
        {/* ASIN Total Units */}
        <Card className="glass-container">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ASIN Total Units</p>
                <p className="text-2xl font-bold text-blue-600">{stats.asinTotalUnits}</p>
                <p className="text-xs text-muted-foreground">ASIN inventory</p>
              </div>
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* ASIN Sold Units */}
        <Card className="glass-container">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ASIN Sold Units</p>
                <p className="text-2xl font-bold text-orange-600">{stats.asinSoldUnits}</p>
                <p className="text-xs text-muted-foreground">ASIN sold</p>
              </div>
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* SKU Total Units - Only show when not ASIN-only mode */}
        {!showOnlyAsin && (
          <Card className="glass-container">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SKU Total Units</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.skuTotalUnits}</p>
                  <p className="text-xs text-muted-foreground">SKU inventory</p>
                </div>
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* SKU Sold Units - Only show when not ASIN-only mode */}
        {!showOnlyAsin && (
          <Card className="glass-container">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SKU Sold Units</p>
                  <p className="text-2xl font-bold text-pink-600">{stats.skuSoldUnits}</p>
                  <p className="text-xs text-muted-foreground">SKU sold</p>
                </div>
                <TrendingDown className="w-6 h-6 text-pink-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {selectedMetric === 'active' && 'All Active Items'}
              {selectedMetric === 'instock' && 'In Stock Items'}
              {selectedMetric === 'outofstock' && 'Out of Stock Items'}
              <Badge variant="outline" className="ml-2">
                {filteredItems.length} items
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 focus:border-primary/50"
              />
            </div>
            <Button 
              onClick={exportToExcel}
              disabled={exportLoading || filteredItems.length === 0}
              className="gap-2"
            >
              {exportLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export
            </Button>
          </div>

          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Date Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.type === 'asin' ? 'default' : 'secondary'}>
                        {item.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.identifier}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        item.quantity === 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.status === 'in-stock' ? 'default' :
                        item.status === 'sold' ? 'secondary' :
                        item.status === 'ordered' ? 'outline' : 'destructive'
                      }>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.date_added).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {item.date_sold ? new Date(item.date_sold).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}