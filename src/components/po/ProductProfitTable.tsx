import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, TrendingUp, CheckCircle, XCircle, Filter, X } from 'lucide-react';
import { ProductProfitItem, ProfitSettings } from './ProductProfitAnalyzer';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ProductProfitTableProps {
  items: ProductProfitItem[];
  settings: ProfitSettings;
}

type StatusFilter = 'matched' | 'unmatched';
type ProfitFilter = 'profitable' | 'loss';
type MarginFilter = 'high' | 'medium' | 'low';

export const ProductProfitTable: React.FC<ProductProfitTableProps> = ({ items, settings }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof ProductProfitItem>('profit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [profitFilters, setProfitFilters] = useState<ProfitFilter[]>([]);
  const [marginFilters, setMarginFilters] = useState<MarginFilter[]>([]);

  const toggleFilter = <T extends string>(
    current: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    value: T
  ) => {
    setter(current.includes(value) 
      ? current.filter(f => f !== value) 
      : [...current, value]
    );
  };

  const clearAllFilters = () => {
    setStatusFilters([]);
    setProfitFilters([]);
    setMarginFilters([]);
  };

  const activeFilterCount = statusFilters.length + profitFilters.length + marginFilters.length;

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

    // Apply status filter
    if (statusFilters.length > 0) {
      filtered = filtered.filter(item => statusFilters.includes(item.status as StatusFilter));
    }

    // Apply profit filter
    if (profitFilters.length > 0) {
      filtered = filtered.filter(item => {
        if (profitFilters.includes('profitable') && item.profit >= 0) return true;
        if (profitFilters.includes('loss') && item.profit < 0) return true;
        return false;
      });
    }

    // Apply margin filter
    if (marginFilters.length > 0) {
      filtered = filtered.filter(item => {
        if (marginFilters.includes('high') && item.margin >= 15) return true;
        if (marginFilters.includes('medium') && item.margin >= 5 && item.margin < 15) return true;
        if (marginFilters.includes('low') && item.margin < 5) return true;
        return false;
      });
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
  }, [items, searchQuery, sortField, sortDirection, statusFilters, profitFilters, marginFilters]);

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
        'Original Currency': item.currency_code || '-',
        'Original Price': item.selling_price.toFixed(2),
        'Cost to Amazon': (item.converted_selling_price || item.selling_price).toFixed(2),
        'Buying Cost': (item.converted_buying_cost || 0).toFixed(2),
        'Shipping Cost': item.shipping_cost.toFixed(2),
        'Commission': item.commission.toFixed(2),
        'Profit': item.profit.toFixed(2),
        'Margin %': item.margin.toFixed(2),
        'Display Currency': settings.currency,
        'Status': item.status,
        'Source SKU': item.sunsky_sku_code || ''
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
        {/* Search and Filter Toggle */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ASIN, SKU, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filters</span>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Status Filters */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={statusFilters.includes('matched') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleFilter(statusFilters, setStatusFilters, 'matched')}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Matched
                  </Badge>
                  <Badge
                    variant={statusFilters.includes('unmatched') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleFilter(statusFilters, setStatusFilters, 'unmatched')}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Unmatched
                  </Badge>
                </div>
              </div>

              {/* Profit Filters */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Profit Status</span>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={profitFilters.includes('profitable') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleFilter(profitFilters, setProfitFilters, 'profitable')}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Profitable
                  </Badge>
                  <Badge
                    variant={profitFilters.includes('loss') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleFilter(profitFilters, setProfitFilters, 'loss')}
                  >
                    Loss
                  </Badge>
                </div>
              </div>

              {/* Margin Filters */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Margin Range</span>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={marginFilters.includes('high') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80 text-green-600 border-green-500/30"
                    onClick={() => toggleFilter(marginFilters, setMarginFilters, 'high')}
                  >
                    High ≥15%
                  </Badge>
                  <Badge
                    variant={marginFilters.includes('medium') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80 text-orange-600 border-orange-500/30"
                    onClick={() => toggleFilter(marginFilters, setMarginFilters, 'medium')}
                  >
                    Medium 5-15%
                  </Badge>
                  <Badge
                    variant={marginFilters.includes('low') ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80 text-red-600 border-red-500/30"
                    onClick={() => toggleFilter(marginFilters, setMarginFilters, 'low')}
                  >
                    Low &lt;5%
                  </Badge>
                </div>
              </div>
            </div>
          )}
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
                    <TableCell className="text-right" title={`Original: ${item.currency_code || 'N/A'} ${item.selling_price.toFixed(2)}`}>
                      <div className="font-mono font-semibold">
                        {(item.converted_selling_price || item.selling_price).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {settings.currency}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono" title={`Sunsky: ${item.sunsky_currency || 'USD'} ${(item.buying_cost || 0).toFixed(2)}`}>
                      {item.converted_buying_cost ? item.converted_buying_cost.toFixed(2) : '-'}
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
