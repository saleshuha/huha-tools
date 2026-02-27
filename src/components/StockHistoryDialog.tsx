import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { History, Package, AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus, BarChart3, Hash, Layers } from 'lucide-react';
import { StockHistoryFilters, StockHistoryFilterState } from './stock-history/StockHistoryFilters';
import { StockChange } from './stock-history/StockHistoryChangeCard';
import { StockHistoryExport } from './stock-history/StockHistoryExport';
import { StockHistoryChart } from './stock-history/StockHistoryChart';
import { StockLedgerRow } from './stock-history/StockLedgerRow';
import { isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface StockHistoryDialogProps {
  inventoryId: string;
  itemIdentifier: string;
  inventoryType: 'asin' | 'sku';
}

export function StockHistoryDialog({ inventoryId, itemIdentifier, inventoryType }: StockHistoryDialogProps) {
  const [stockChanges, setStockChanges] = useState<StockChange[]>([]);
  const [filteredChanges, setFilteredChanges] = useState<StockChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [filters, setFilters] = useState<StockHistoryFilterState>({
    searchTerm: '',
    selectedReferenceType: 'all',
    changeType: 'all',
  });

  const loadStockHistory = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data: changes, error: changesError } = await supabase
        .from('stock_changes')
        .select('*')
        .eq('inventory_id', inventoryId)
        .eq('inventory_type', inventoryType)
        .order('created_at', { ascending: false });

      if (changesError) throw changesError;

      const userIds = [...new Set(changes?.map(c => c.changed_by).filter(Boolean) || [])];
      let userMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        userMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      const enrichedChanges: StockChange[] = (changes || []).map(change => ({
        ...change,
        user_email: userMap.get(change.changed_by)?.email || 'Unknown',
        user_name: userMap.get(change.changed_by)?.full_name || 'System',
      }));

      setStockChanges(enrichedChanges);
      setFilteredChanges(enrichedChanges);
    } catch (error) {
      console.error('❌ Error loading stock history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  }, [open, inventoryId, inventoryType]);

  // Filter logic
  useEffect(() => {
    let filtered = [...stockChanges];
    if (filters.selectedReferenceType !== 'all') filtered = filtered.filter(c => c.reference_type === filters.selectedReferenceType);
    if (filters.changeType === 'increase') filtered = filtered.filter(c => c.change_amount > 0);
    else if (filters.changeType === 'decrease') filtered = filtered.filter(c => c.change_amount < 0);
    if (filters.dateRange?.from) {
      filtered = filtered.filter(c => {
        const changeDate = new Date(c.created_at);
        return isWithinInterval(changeDate, { start: filters.dateRange!.from!, end: filters.dateRange!.to || filters.dateRange!.from! });
      });
    }
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.change_reason?.toLowerCase().includes(search) ||
        c.reference_number?.toLowerCase().includes(search) ||
        c.notes?.toLowerCase().includes(search) ||
        c.user_email?.toLowerCase().includes(search)
      );
    }
    if (filters.selectedUser) filtered = filtered.filter(c => c.changed_by === filters.selectedUser);
    setFilteredChanges(filtered);
  }, [stockChanges, filters]);

  // Summary stats
  const summary = useMemo(() => {
    if (!stockChanges.length) return null;
    const currentStock = stockChanges[0]?.new_quantity ?? 0;
    const totalIncrease = stockChanges.filter(c => c.change_amount > 0).reduce((s, c) => s + c.change_amount, 0);
    const totalDecrease = Math.abs(stockChanges.filter(c => c.change_amount < 0).reduce((s, c) => s + c.change_amount, 0));
    const netChange = totalIncrease - totalDecrease;
    return { currentStock, totalIncrease, totalDecrease, netChange, totalChanges: stockChanges.length };
  }, [stockChanges]);

  const runningBalances = useMemo(() => {
    const balances = new Map<string, number>();
    const sorted = [...filteredChanges].reverse();
    sorted.forEach(change => {
      balances.set(change.id, change.new_quantity);
    });
    return balances;
  }, [filteredChanges]);

  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { id: string; email: string }>();
    stockChanges.forEach(c => {
      if (c.changed_by && (c.user_email || c.user_name)) {
        users.set(c.changed_by, { id: c.changed_by, email: c.user_email || c.user_name || 'Unknown' });
      }
    });
    return Array.from(users.values());
  }, [stockChanges]);

  const referenceTypes = useMemo(() => Array.from(new Set(stockChanges.map(c => c.reference_type).filter(Boolean))), [stockChanges]);

  useEffect(() => { if (open) loadStockHistory(); }, [open, loadStockHistory]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-7 w-7">
          <History className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] w-[95vw] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Stock Ledger</DialogTitle>
                <div className="text-xs text-muted-foreground font-mono">{itemIdentifier}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <StockHistoryExport changes={filteredChanges} itemIdentifier={itemIdentifier} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadStockHistory} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Stat Bar */}
        {summary && (
          <div className="px-5 pt-3 pb-0">
            <div className="flex items-stretch gap-2 flex-wrap">
              <StatPill icon={<Layers className="w-3.5 h-3.5" />} label="Current" value={String(summary.currentStock)} accent="primary" />
              <StatPill icon={<TrendingUp className="w-3.5 h-3.5" />} label="In" value={`+${summary.totalIncrease}`} accent="emerald" />
              <StatPill icon={<TrendingDown className="w-3.5 h-3.5" />} label="Out" value={`-${summary.totalDecrease}`} accent="rose" />
              <StatPill
                icon={summary.netChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                label="Net"
                value={`${summary.netChange >= 0 ? '+' : ''}${summary.netChange}`}
                accent={summary.netChange >= 0 ? 'emerald' : 'rose'}
              />
              <StatPill icon={<Hash className="w-3.5 h-3.5" />} label="Entries" value={String(summary.totalChanges)} accent="muted" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 mt-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="text-sm text-muted-foreground">Loading ledger...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-2">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-destructive font-medium text-sm">Error loading history</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : stockChanges.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <History className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="font-medium text-muted-foreground text-sm">No stock changes recorded</p>
              <p className="text-xs text-muted-foreground">
                History appears when you update quantities, restock, fulfill, or sell.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="ledger" className="flex flex-col flex-1 min-h-0">
              <div className="px-5 border-b">
                <TabsList className="h-9 bg-transparent p-0 gap-4">
                  <TabsTrigger
                    value="ledger"
                    className="h-9 px-0 pb-2 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-semibold uppercase tracking-wider"
                  >
                    <History className="w-3.5 h-3.5 mr-1.5" />
                    Ledger
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="h-9 px-0 pb-2 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-semibold uppercase tracking-wider"
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Ledger Tab */}
              <TabsContent value="ledger" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
                {/* Compact filters */}
                <div className="px-5 py-2.5 border-b bg-muted/20">
                  <StockHistoryFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    referenceTypes={referenceTypes}
                    users={uniqueUsers}
                    totalCount={stockChanges.length}
                    filteredCount={filteredChanges.length}
                  />
                </div>

                {/* Ledger table */}
                <div className="flex-1 overflow-y-auto">
                  {filteredChanges.length === 0 ? (
                    <div className="text-center py-12">
                      <Minus className="h-8 w-8 text-muted-foreground mx-auto opacity-40 mb-2" />
                      <p className="text-sm text-muted-foreground">No entries match filters</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-b-2 border-border">
                          <TableHead className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-bold w-[90px]">Date</TableHead>
                          <TableHead className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-bold w-[100px]">User</TableHead>
                          <TableHead className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-bold w-[90px]">Type</TableHead>
                          <TableHead className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-bold text-center w-[120px]">Prev → New</TableHead>
                          <TableHead className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-bold text-right w-[70px]">Change</TableHead>
                          <TableHead className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-bold text-right w-[70px]">Balance</TableHead>
                          <TableHead className="py-2.5 px-3 text-[10px] uppercase tracking-wider font-bold">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChanges.map((change, index) => (
                          <StockLedgerRow
                            key={change.id}
                            change={change}
                            runningBalance={runningBalances.get(change.id) ?? change.new_quantity}
                            isEven={index % 2 === 0}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Footer */}
                {filteredChanges.length > 0 && (
                  <div className="px-5 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>
                      Showing <span className="font-semibold text-foreground">{filteredChanges.length}</span> of{' '}
                      <span className="font-semibold text-foreground">{stockChanges.length}</span> entries
                    </span>
                    <span className="font-mono">
                      Latest: {filteredChanges[0] && new Date(filteredChanges[0].created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="flex-1 overflow-y-auto mt-0 p-5">
                <StockHistoryChart changes={stockChanges} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Compact stat pill component */
function StatPill({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    muted: 'bg-muted text-muted-foreground',
  };
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs",
      colorMap[accent] || colorMap.muted
    )}>
      {icon}
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

export { StockHistoryDialog as EnhancedStockHistoryDialog };
