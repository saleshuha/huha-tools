import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { History, Package, AlertCircle, RefreshCw, Keyboard } from 'lucide-react';
import { StockHistoryFilters, StockHistoryFilterState } from './stock-history/StockHistoryFilters';
import { StockHistoryStats, StockHistoryStatistics } from './stock-history/StockHistoryStats';
import { StockHistoryChangeCard, StockChange } from './stock-history/StockHistoryChangeCard';
import { StockHistoryExport } from './stock-history/StockHistoryExport';
import { StockHistoryChart } from './stock-history/StockHistoryChart';
import { isWithinInterval, differenceInDays } from 'date-fns';

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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
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
        user_email: userMap.get(change.changed_by)?.email,
        user_name: userMap.get(change.changed_by)?.full_name,
      }));

      setStockChanges(enrichedChanges);
      setFilteredChanges(enrichedChanges);
    } catch (error) {
      console.error('Error loading stock history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  }, [open, inventoryId, inventoryType]);

  useEffect(() => {
    let filtered = [...stockChanges];
    if (activeTab !== 'all') filtered = filtered.filter(c => c.reference_type === activeTab);
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
  }, [stockChanges, filters, activeTab]);

  const stats: StockHistoryStatistics | null = useMemo(() => {
    if (!filteredChanges.length) return null;
    const increases = filteredChanges.filter(c => c.change_amount > 0);
    const decreases = filteredChanges.filter(c => c.change_amount < 0);
    const totalIncrease = increases.reduce((sum, c) => sum + c.change_amount, 0);
    const totalDecrease = Math.abs(decreases.reduce((sum, c) => sum + c.change_amount, 0));
    const refTypeBreakdown = filteredChanges.reduce((acc, change) => {
      acc[change.reference_type || 'unknown'] = (acc[change.reference_type || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const dates = filteredChanges.map(c => new Date(c.created_at).getTime());
    const daysTracked = dates.length > 1 ? differenceInDays(Math.max(...dates), Math.min(...dates)) || 1 : 1;
    return {
      totalChanges: filteredChanges.length,
      increases: increases.length,
      decreases: decreases.length,
      totalIncrease,
      totalDecrease,
      netChange: totalIncrease - totalDecrease,
      poFulfillments: filteredChanges.filter(c => c.reference_type === 'po_order').length,
      refTypeBreakdown,
      averageDailyChange: (totalIncrease - totalDecrease) / daysTracked,
      velocity: Math.abs(totalIncrease - totalDecrease) / daysTracked,
    };
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
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          Stock History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] w-[95vw] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-2 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <DialogTitle>Stock History</DialogTitle>
            </div>
            <div className="flex gap-2">
              <StockHistoryExport changes={filteredChanges} itemIdentifier={itemIdentifier} />
              <Button variant="ghost" size="sm" onClick={loadStockHistory} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">{itemIdentifier}</div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : stockChanges.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">No stock history available</p>
            </div>
          ) : (
            <>
              <StockHistoryFilters filters={filters} onFilterChange={setFilters} referenceTypes={referenceTypes} users={uniqueUsers} totalCount={stockChanges.length} filteredCount={filteredChanges.length} />
              {stats && <StockHistoryStats stats={stats} />}
              {filteredChanges.length > 2 && <StockHistoryChart changes={filteredChanges} />}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-4 h-9">
                  <TabsTrigger value="all" className="text-xs">All ({stockChanges.length})</TabsTrigger>
                  <TabsTrigger value="po_order" className="text-xs">PO ({stockChanges.filter(c => c.reference_type === 'po_order').length})</TabsTrigger>
                  <TabsTrigger value="restock" className="text-xs">Restock ({stockChanges.filter(c => c.reference_type === 'restock').length})</TabsTrigger>
                  <TabsTrigger value="manual" className="text-xs">Manual ({stockChanges.filter(c => c.reference_type === 'manual').length})</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-3 pr-2">
                  <div className="space-y-2">
                    {filteredChanges.map(change => (
                      <StockHistoryChangeCard key={change.id} change={change} isExpanded={expandedItems.has(change.id)} onToggleExpanded={() => {
                        const next = new Set(expandedItems);
                        next.has(change.id) ? next.delete(change.id) : next.add(change.id);
                        setExpandedItems(next);
                      }} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { StockHistoryDialog as EnhancedStockHistoryDialog };
