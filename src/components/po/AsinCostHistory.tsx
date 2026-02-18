import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, TrendingUp, TrendingDown, Minus, DollarSign, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useProductImages } from '@/hooks/useProductImages';

interface CostEntry {
  asin: string;
  sku_code: string | null;
  title: string | null;
  supplier_name: string | null;
  costs: { date: string; cost: number; supplier: string | null }[];
}

export const AsinCostHistory = () => {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { productImages } = useProductImages();

  useEffect(() => {
    fetchCostHistory();
  }, []);

  const fetchCostHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: costData, error: costError } = await supabase
        .from('asin_cost_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_date', { ascending: false });

      if (costError) {
        console.error('Error fetching cost history:', costError);
        return;
      }

      setRawData(costData || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group by ASIN and get last 10 cost entries per ASIN
  const costEntries = useMemo((): CostEntry[] => {
    const grouped = new Map<string, CostEntry>();

    for (const row of rawData) {
      const key = row.asin;
      if (!grouped.has(key)) {
        grouped.set(key, {
          asin: row.asin,
          sku_code: row.sku_code,
          title: row.title,
          supplier_name: row.supplier_name,
          costs: [],
        });
      }
      const entry = grouped.get(key)!;
      if (!entry.title && row.title) entry.title = row.title;
      if (!entry.sku_code && row.sku_code) entry.sku_code = row.sku_code;
      entry.costs.push({
        date: row.recorded_date,
        cost: parseFloat(row.unit_cost),
        supplier: row.supplier_name,
      });
    }

    // Keep only last 10 cost entries per ASIN
    for (const entry of grouped.values()) {
      entry.costs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      entry.costs = entry.costs.slice(0, 10);
    }

    return Array.from(grouped.values());
  }, [rawData]);

  // Get all unique dates across all entries (up to 10)
  const dateColumns = useMemo(() => {
    const allDates = new Set<string>();
    for (const entry of costEntries) {
      for (const cost of entry.costs) {
        allDates.add(cost.date);
      }
    }
    return Array.from(allDates)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 10);
  }, [costEntries]);

  // Collect ASINs for image lookup
  const getImage = (asin: string) => productImages?.find(i => i.asin === asin);

  // Filter
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return costEntries;
    const term = searchTerm.toLowerCase();
    return costEntries.filter(e =>
      e.asin?.toLowerCase().includes(term) ||
      e.sku_code?.toLowerCase().includes(term) ||
      e.title?.toLowerCase().includes(term) ||
      e.supplier_name?.toLowerCase().includes(term)
    );
  }, [costEntries, searchTerm]);

  const getCostTrend = (costs: CostEntry['costs'], index: number) => {
    if (index >= costs.length - 1) return null;
    const current = costs[index]?.cost;
    const prev = costs[index + 1]?.cost;
    if (!current || !prev) return null;
    if (current > prev) return 'up';
    if (current < prev) return 'down';
    return 'same';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading cost history...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            ASIN Cost History
          </CardTitle>
          <Badge variant="secondary">{costEntries.length} ASINs tracked</Badge>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ASIN, SKU, title, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No cost history recorded yet.</p>
            <p className="text-xs mt-1">Cost data will appear here when suppliers enter unit costs via purchase links.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead className="min-w-[120px]">ASIN / SKU</TableHead>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead>Supplier</TableHead>
                  {dateColumns.map(date => (
                    <TableHead key={date} className="text-center min-w-[90px]">
                      <div className="text-[10px] leading-tight">
                        {format(new Date(date), 'dd MMM')}
                        <br />
                        <span className="text-muted-foreground">{format(new Date(date), 'yyyy')}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => {
                  const img = getImage(entry.asin);
                  const costByDate = new Map(entry.costs.map(c => [c.date, c]));
                  
                  return (
                    <TableRow key={entry.asin}>
                      <TableCell>
                        <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center overflow-hidden">
                          {img?.image_url ? (
                            <img src={img.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-mono text-xs">{entry.asin}</p>
                          {entry.sku_code && (
                            <p className="font-mono text-[10px] text-muted-foreground">{entry.sku_code}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs line-clamp-2">{entry.title || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground">{entry.supplier_name || '-'}</p>
                      </TableCell>
                      {dateColumns.map((date, idx) => {
                        const costEntry = costByDate.get(date);
                        if (!costEntry) {
                          return <TableCell key={date} className="text-center text-muted-foreground/30 text-xs">-</TableCell>;
                        }

                        // Find trend compared to next (older) date that has data
                        const olderEntries = entry.costs.filter(c => new Date(c.date) < new Date(date));
                        const prevCost = olderEntries.length > 0 ? olderEntries[0].cost : null;
                        let trend: string | null = null;
                        if (prevCost !== null) {
                          if (costEntry.cost > prevCost) trend = 'up';
                          else if (costEntry.cost < prevCost) trend = 'down';
                          else trend = 'same';
                        }

                        return (
                          <TableCell key={date} className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs font-medium">${costEntry.cost.toFixed(2)}</span>
                          {trend === 'up' && <TrendingUp className="h-3 w-3 text-destructive" />}
                              {trend === 'down' && <TrendingDown className="h-3 w-3 text-primary" />}
                              {trend === 'same' && <Minus className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            {costEntry.supplier && (
                              <p className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[80px]">{costEntry.supplier}</p>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
