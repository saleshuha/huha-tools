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
import { Package, CheckCircle, XCircle, Search, Download, RefreshCw, Activity, BarChart3, TrendingDown, Tag, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
interface SkuInventoryItem {
  id: string;
  sku_number: string;
  bin_serial_number: string;
  quantity: number;
  status: string;
  date_added: string;
  date_sold?: string;
  country: string;
}
interface SkuInventoryStats {
  activeItems: number;
  inStockItems: number;
  outOfStockItems: number;
  recentlyAdded: number;
  totalUnits: number;
  soldUnits: number;
  missingSku: number;
}
export function SkuInventoryMetrics() {
  const {
    selectedCountry
  } = useCountry();
  const {
    toast
  } = useToast();
  const [stats, setStats] = useState<SkuInventoryStats>({
    activeItems: 0,
    inStockItems: 0,
    outOfStockItems: 0,
    recentlyAdded: 0,
    totalUnits: 0,
    soldUnits: 0,
    missingSku: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'active' | 'instock' | 'outofstock' | 'recentlyadded' | 'totalunits' | 'soldunits' | 'missingsku' | null>(null);
  const [inventoryItems, setInventoryItems] = useState<SkuInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const loadMetrics = async () => {
    try {
      setLoading(true);
      const {
        data: skuData
      } = await supabase.from('sku_inventory').select('*').eq('country' as any, selectedCountry as any);
      const allItems = ((skuData as any) || []);
      const activeItems = allItems.length;
      const inStockItems = allItems.filter((item: any) => item.quantity > 0).length;
      const outOfStockItems = allItems.filter((item: any) => item.quantity === 0).length;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentlyAdded = allItems.filter((item: any) => new Date(item.date_added) >= sevenDaysAgo).length;
      const totalUnits = allItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const soldUnits = allItems.filter((item: any) => item.status === 'sold').reduce((sum: number, item: any) => sum + item.quantity, 0);
      const missingSku = allItems.filter((item: any) => !item.sku_number || item.sku_number.trim() === '').length;
      setStats({
        activeItems,
        inStockItems,
        outOfStockItems,
        recentlyAdded,
        totalUnits,
        soldUnits,
        missingSku
      });
    } catch (error: any) {
      toast({
        title: "Error loading SKU metrics",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadDetailedItems = async (metric: 'active' | 'instock' | 'outofstock' | 'recentlyadded' | 'missingsku') => {
    try {
      const {
        data: skuData
      } = await supabase.from('sku_inventory').select('*').eq('country' as any, selectedCountry as any);
      let filteredItems = ((skuData as any) || []);

      // Filter based on metric
      if (metric === 'instock') {
        filteredItems = filteredItems.filter((item: any) => item.quantity > 0);
      } else if (metric === 'outofstock') {
        filteredItems = filteredItems.filter((item: any) => item.quantity === 0);
      } else if (metric === 'recentlyadded') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filteredItems = filteredItems.filter((item: any) => new Date(item.date_added) >= sevenDaysAgo);
      } else if (metric === 'missingsku') {
        filteredItems = filteredItems.filter((item: any) => !item.sku_number || item.sku_number.trim() === '');
      }
      setInventoryItems(filteredItems as any);
    } catch (error: any) {
      toast({
        title: "Error loading SKU items",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleMetricClick = async (metric: 'active' | 'instock' | 'outofstock' | 'recentlyadded' | 'missingsku') => {
    setSelectedMetric(metric);
    await loadDetailedItems(metric);
  };
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      const exportData = filteredItems.map(item => ({
        'SKU Number': item.sku_number,
        'Bin/Serial Number': `="${item.bin_serial_number}"`, // Preserve leading zeros
        'Quantity': item.quantity,
        'Status': item.status,
        'Country': item.country,
        'Date Added': new Date(item.date_added).toLocaleDateString(),
        'Date Sold': item.date_sold ? new Date(item.date_sold).toLocaleDateString() : ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedMetric}_sku_inventory`);
      const filename = `${selectedMetric}_sku_inventory_${selectedCountry}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast({
        title: "Export successful",
        description: `Exported ${filteredItems.length} SKU items to ${filename}`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
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
  const filteredItems = inventoryItems.filter(item => item.sku_number.toLowerCase().includes(searchTerm.toLowerCase()) || item.bin_serial_number.toLowerCase().includes(searchTerm.toLowerCase()) || item.status.toLowerCase().includes(searchTerm.toLowerCase()));
  if (loading) {
    return <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>;
  }
  return <>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-3">
        {/* Active SKU Items */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-primary" 
          onClick={() => handleMetricClick('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">Active SKU Items</CardTitle>
              <div className="text-xl font-bold text-primary mt-1">{stats.activeItems}</div>
            </div>
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Total SKU inventory</p>
          </CardContent>
        </Card>

        {/* In Stock SKU Items */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-green-500" 
          onClick={() => handleMetricClick('instock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">SKU In Stock</CardTitle>
              <div className="text-xl font-bold text-green-600 mt-1">{stats.inStockItems}</div>
            </div>
            <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Available SKUs</p>
          </CardContent>
        </Card>

        {/* Out of Stock SKU Items */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-red-500" 
          onClick={() => handleMetricClick('outofstock')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">SKU Out of Stock</CardTitle>
              <div className="text-xl font-bold text-red-600 mt-1">{stats.outOfStockItems}</div>
            </div>
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Need restock</p>
          </CardContent>
        </Card>

        {/* Recently Added Items */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-blue-500" 
          onClick={() => handleMetricClick('recentlyadded')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">Recently Added</CardTitle>
              <div className="text-xl font-bold text-blue-600 mt-1">{stats.recentlyAdded}</div>
            </div>
            <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Last 7 days</p>
          </CardContent>
        </Card>

        {/* Total Units */}
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">Total Units</CardTitle>
              <div className="text-xl font-bold text-purple-600 mt-1">{stats.totalUnits}</div>
            </div>
            <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Total quantity</p>
          </CardContent>
        </Card>

        {/* Missing SKU Items */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-background h-24 flex flex-col border-l-4 border-l-orange-500" 
          onClick={() => handleMetricClick('missingsku')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 flex-1">
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate">Missing SKU</CardTitle>
              <div className="text-xl font-bold text-orange-600 mt-1">{stats.missingSku}</div>
            </div>
            <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Tag className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground truncate">Need SKU numbers</p>
          </CardContent>
        </Card>


      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {selectedMetric === 'active' && 'All Active SKU Items'}
              {selectedMetric === 'instock' && 'SKU Items In Stock'}
              {selectedMetric === 'outofstock' && 'SKU Items Out of Stock'}
              {selectedMetric === 'recentlyadded' && 'Recently Added SKU Items'}
              {selectedMetric === 'missingsku' && 'SKU Items Missing SKU Numbers'}
              <Badge variant="outline" className="ml-2">
                {filteredItems.length} items
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search SKU items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 border-2 focus:border-primary/50" />
            </div>
            <Button onClick={exportToExcel} disabled={exportLoading || filteredItems.length === 0} className="gap-2">
              {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </Button>
          </div>

          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU Number</TableHead>
                  <TableHead>Bin/Serial Number</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Date Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku_number}</TableCell>
                    <TableCell>{item.bin_serial_number}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${item.quantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'in-stock' ? 'default' : item.status === 'sold' ? 'secondary' : item.status === 'ordered' ? 'outline' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.date_added).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {item.date_sold ? new Date(item.date_sold).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>;
}