import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import { ProductProfitItem, ProfitSettings } from './ProductProfitAnalyzer';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ProductProfitTableProps {
  items: ProductProfitItem[];
  settings: ProfitSettings;
}

export const ProductProfitTable: React.FC<ProductProfitTableProps> = ({ items, settings }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof ProductProfitItem>('profit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.asin?.toLowerCase().includes(query) ||
        item.model_number?.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.sunsky_sku_code?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortDirection === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return filtered;
  }, [items, searchQuery, sortField, sortDirection]);

  const handleSort = (field: keyof ProductProfitItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredItems.map(item => ({
        'ASIN': item.asin || '',
        'Model Number': item.model_number || '',
        'Title': item.title || '',
        'Cost to Amazon': item.selling_price.toFixed(2),
        'Buying Cost': (item.buying_cost || 0).toFixed(2),
        'Shipping Cost': item.shipping_cost.toFixed(2),
        'Commission': item.commission.toFixed(2),
        'Profit': item.profit.toFixed(2),
        'Margin %': item.margin.toFixed(2),
        'Status': item.status,
        'Source SKU': item.sunsky_sku_code || '',
        'Currency': item.currency || settings.currency
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Profit Analysis');

      // Auto-size columns
      const maxWidth = exportData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
      ws['!cols'] = Array(maxWidth).fill({ width: 15 });

      XLSX.writeFile(wb, `profit-analysis-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Export successful",
        description: `${exportData.length} items exported to Excel`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Analysis Results</CardTitle>
          <CardDescription>Upload a file to start analyzing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data to display</p>
            <p className="text-sm mt-2">Upload a file with selling prices to begin analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profit Analysis Results</CardTitle>
            <CardDescription>
              {filteredItems.length} of {items.length} items
            </CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ASIN, SKU, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 min-w-[250px]"
                onClick={() => handleSort('title')}
              >
                Product
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('selling_price')}
              >
                Cost to Amazon
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('buying_cost')}
              >
                Buying Cost
              </TableHead>
              <TableHead className="text-right">Shipping</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('profit')}
              >
                Profit
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('margin')}
              >
                Margin
              </TableHead>
            </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {item.status === 'matched' ? (
                        <Badge variant="default" className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Matched
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30">
                          <XCircle className="h-3 w-3 mr-1" />
                          Unmatched
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="font-medium truncate" title={item.title}>
                        {item.title || '-'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        {item.asin && <span>ASIN: {item.asin}</span>}
                        {item.asin && item.model_number && <span className="mx-1">|</span>}
                        {item.model_number && <span>Model: {item.model_number}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-mono font-semibold">
                        {item.selling_price.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.currency_code || settings.currency}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.buying_cost > 0 ? item.buying_cost.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.shipping_cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.commission.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${
                      item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.profit.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${
                      item.margin >= 15 ? 'text-green-600' : item.margin >= 5 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {item.margin.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
