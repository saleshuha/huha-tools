import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { HuhaTab01 } from './ui/huha-tab-01';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { History, Package, AlertCircle, RefreshCw, Keyboard, Filter, Clock } from 'lucide-react';
import { StockHistoryFilters, StockHistoryFilterState } from './stock-history/StockHistoryFilters';
import { StockHistoryStats, StockHistoryStatistics } from './stock-history/StockHistoryStats';
import { StockHistoryChangeCard, StockChange } from './stock-history/StockHistoryChangeCard';
import { StockHistoryExport } from './stock-history/StockHistoryExport';
import { StockHistoryChart } from './stock-history/StockHistoryChart';
import { isWithinInterval, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

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
  const [mainTab, setMainTab] = useState<'activity' | 'analytics'>('activity');
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
      console.log('📊 Loading stock history for:', {
        inventoryId,
        inventoryType,
        itemIdentifier
      });
      
      const { data: changes, error: changesError } = await supabase
        .from('stock_changes')
        .select('*')
        .eq('inventory_id', inventoryId)
        .eq('inventory_type', inventoryType)
        .order('created_at', { ascending: false });

      if (changesError) throw changesError;

      console.log('📊 Stock changes loaded:', {
        count: changes?.length || 0,
        changes: changes?.slice(0, 3)
      });

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

      if (enrichedChanges.length === 0) {
        console.log('⚠️ No stock history found for this item');
      }

      setStockChanges(enrichedChanges);
      setFilteredChanges(enrichedChanges);
    } catch (error) {
      console.error('❌ Error loading stock history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  }, [open, inventoryId, inventoryType, itemIdentifier]);

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
      <DialogContent className="max-w-5xl max-h-[85vh] w-[95vw] flex flex-col">
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
        
        <div className="flex-1 flex flex-col gap-3 pt-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Loading stock history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-2">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-destructive font-medium">Error loading history</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : stockChanges.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <History className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">No stock changes recorded yet</p>
                <p className="text-sm text-muted-foreground">
                  History will appear here when you:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                  <li>• Update item quantities</li>
                  <li>• Restock items</li>
                  <li>• Fulfill from stock</li>
                  <li>• Mark items as sold</li>
                </ul>
              </div>
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <p className="font-medium text-muted-foreground">No changes match your filters</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <>
              <StockHistoryFilters 
                filters={filters} 
                onFilterChange={setFilters} 
                referenceTypes={referenceTypes} 
                users={uniqueUsers} 
                totalCount={stockChanges.length} 
                filteredCount={filteredChanges.length} 
              />
              
              <HuhaTab01
                value={mainTab}
                onValueChange={(value) => setMainTab(value as 'activity' | 'analytics')}
                items={[
                  {
                    value: 'activity',
                    label: '📊 Activity Feed',
                  content: (
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-4 h-9">
                          <TabsTrigger value="all" className="text-xs">
                            All ({filteredChanges.length})
                          </TabsTrigger>
                          <TabsTrigger value="po_order" className="text-xs">
                            PO ({filteredChanges.filter(c => c.reference_type === 'po_order').length})
                          </TabsTrigger>
                          <TabsTrigger value="restock" className="text-xs">
                            Restock ({filteredChanges.filter(c => c.reference_type === 'restock').length})
                          </TabsTrigger>
                          <TabsTrigger value="manual" className="text-xs">
                            Manual ({filteredChanges.filter(c => c.reference_type === 'manual').length})
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value={activeTab} className="mt-2 pr-2">
                          <div className="space-y-3">
                            {filteredChanges.map((change, index) => {
                              let timeGapElement = null;
                              if (index < filteredChanges.length - 1) {
                                const currentTime = new Date(change.created_at);
                                const previousTime = new Date(filteredChanges[index + 1].created_at);
                                const minutesDiff = differenceInMinutes(currentTime, previousTime);
                                const hoursDiff = differenceInHours(currentTime, previousTime);
                                const daysDiff = differenceInDays(currentTime, previousTime);
                                
                                let gapText = null;
                                if (daysDiff > 0) {
                                  gapText = `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'} later`;
                                } else if (hoursDiff > 0) {
                                  gapText = `${hoursDiff} ${hoursDiff === 1 ? 'hour' : 'hours'} later`;
                                } else if (minutesDiff > 5) {
                                  gapText = `${minutesDiff} minutes later`;
                                }
                                
                                if (gapText) {
                                  timeGapElement = (
                                    <div className="flex items-center justify-center gap-2 my-2">
                                      <div className="h-px bg-border flex-1" />
                                      <span className="text-xs text-muted-foreground px-2">
                                        <Clock className="w-3 h-3 inline mr-1" />
                                        {gapText}
                                      </span>
                                      <div className="h-px bg-border flex-1" />
                                    </div>
                                  );
                                }
                              }

                              return (
                                <div key={change.id}>
                                  <StockHistoryChangeCard 
                                    change={change} 
                                    isExpanded={expandedItems.has(change.id)} 
                                    onToggleExpanded={() => {
                                      const next = new Set(expandedItems);
                                      next.has(change.id) ? next.delete(change.id) : next.add(change.id);
                                      setExpandedItems(next);
                                    }} 
                                  />
                                  {timeGapElement}
                                </div>
                              );
                            })}
                          </div>
                        </TabsContent>
                      </Tabs>
                    )
                  },
                  {
                    value: 'analytics',
                    label: '📈 Stock Analytics',
                    content: (
                      <div className="pr-2">
                        <div className="space-y-4">
                        {stats && <StockHistoryStats stats={stats} />}
                        
                        {filteredChanges.length >= 3 ? (
                          <StockHistoryChart changes={filteredChanges} />
                        ) : (
                          <div className="text-center py-12 space-y-2">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                            <p className="font-medium text-muted-foreground">Need more data for analytics</p>
                            <p className="text-sm text-muted-foreground">
                              At least 3 changes required to show charts
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Currently have {filteredChanges.length} {filteredChanges.length === 1 ? 'change' : 'changes'}
                            </p>
                          </div>
                        )}
                        </div>
                      </div>
                    )
                  }
                ]}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { StockHistoryDialog as EnhancedStockHistoryDialog };
