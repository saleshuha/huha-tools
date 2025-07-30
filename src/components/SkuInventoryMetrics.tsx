import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, CheckCircle, XCircle, Search, Download, RefreshCw, Activity, BarChart3, TrendingDown } from 'lucide-react';
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
  totalUnits: number;
  soldUnits: number;
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
    totalUnits: 0,
    soldUnits: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'active' | 'instock' | 'outofstock' | 'totalunits' | 'soldunits' | null>(null);
  const [inventoryItems, setInventoryItems] = useState<SkuInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const loadMetrics = async () => {
    try {
      setLoading(true);
      const {
        data: skuData
      } = await supabase.from('sku_inventory').select('*').eq('country', selectedCountry);
      const allItems = skuData || [];
      const activeItems = allItems.length;
      const inStockItems = allItems.filter(item => item.quantity > 0).length;
      const outOfStockItems = allItems.filter(item => item.quantity === 0).length;
      const totalUnits = allItems.reduce((sum, item) => sum + item.quantity, 0);
      const soldUnits = allItems.filter(item => item.status === 'sold').reduce((sum, item) => sum + item.quantity, 0);
      setStats({
        activeItems,
        inStockItems,
        outOfStockItems,
        totalUnits,
        soldUnits
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
  const loadDetailedItems = async (metric: 'active' | 'instock' | 'outofstock') => {
    try {
      const {
        data: skuData
      } = await supabase.from('sku_inventory').select('*').eq('country', selectedCountry);
      let filteredItems = skuData || [];

      // Filter based on metric
      if (metric === 'instock') {
        filteredItems = filteredItems.filter(item => item.quantity > 0);
      } else if (metric === 'outofstock') {
        filteredItems = filteredItems.filter(item => item.quantity === 0);
      }
      setInventoryItems(filteredItems);
    } catch (error: any) {
      toast({
        title: "Error loading SKU items",
        description: error.message,
        variant: "destructive"
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
        'SKU Number': item.sku_number,
        'Bin/Serial Number': item.bin_serial_number,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Active SKU Items */}
        <Card className="glass-container cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/30" onClick={() => handleMetricClick('active')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active SKU Items</p>
                <p className="text-2xl font-bold text-primary">{stats.activeItems}</p>
                <p className="text-xs text-muted-foreground">Total SKU inventory</p>
              </div>
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* In Stock SKU Items */}
        <Card className="glass-container cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-green-500/30" onClick={() => handleMetricClick('instock')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SKU In Stock</p>
                <p className="text-2xl font-bold text-green-600">{stats.inStockItems}</p>
                <p className="text-xs text-muted-foreground">Available SKUs</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Out of Stock SKU Items */}
        <Card className="glass-container cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-red-500/30" onClick={() => handleMetricClick('outofstock')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SKU Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
                <p className="text-xs text-muted-foreground">Need restock</p>
              </div>
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Units */}
        <Card className="glass-container">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUnits}</p>
                <p className="text-xs text-muted-foreground">Total quantity</p>
              </div>
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
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