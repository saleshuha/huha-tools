import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  History, Calendar, TrendingUp, TrendingDown, Package, 
  BarChart3, ArrowUpDown, Filter, AlertCircle, User, 
  FileText, ExternalLink, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface StockChange {
  id: string;
  created_at: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  change_reason: string;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  changed_by?: string;
  fulfillment_source?: string;
  batch_id?: string;
  notes?: string;
  metadata?: any;
  asin?: string;
  sku_number?: string;
  serial_number?: string;
  user_email?: string;
}

interface EnhancedStockHistoryDialogProps {
  inventoryId: string;
  itemIdentifier: string;
  inventoryType: 'asin' | 'sku';
}

const REFERENCE_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  po_order: { label: 'PO Fulfillment', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: '📦' },
  manual: { label: 'Manual Adjustment', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: '✏️' },
  sale: { label: 'Sale', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400', icon: '💰' },
  restock: { label: 'Restock', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400', icon: '📥' },
  return: { label: 'Return', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', icon: '↩️' },
  damage: { label: 'Damage', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: '⚠️' },
  adjustment: { label: 'Adjustment', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', icon: '⚙️' },
};

export function EnhancedStockHistoryDialog({ inventoryId, itemIdentifier, inventoryType }: EnhancedStockHistoryDialogProps) {
  const [stockChanges, setStockChanges] = useState<StockChange[]>([]);
  const [filteredChanges, setFilteredChanges] = useState<StockChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReferenceType, setSelectedReferenceType] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const loadStockHistory = async () => {
    if (!open) return;
    
    setLoading(true);
    setError(null);
    try {
      // Load stock changes
      const { data, error } = await supabase
        .from('stock_changes')
        .select('*')
        .eq('inventory_id', inventoryId)
        .eq('inventory_type', inventoryType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = (data || []).map(item => ({
        ...item,
        user_email: undefined // User email would require admin API access
      }));
      
      setStockChanges(formattedData);
      setFilteredChanges(formattedData);
    } catch (error) {
      console.error('Error loading stock history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...stockChanges];

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(c => c.reference_type === activeTab);
    }

    // Reference type filter
    if (selectedReferenceType !== 'all') {
      filtered = filtered.filter(c => c.reference_type === selectedReferenceType);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.change_reason?.toLowerCase().includes(search) ||
        c.reference_number?.toLowerCase().includes(search) ||
        c.notes?.toLowerCase().includes(search) ||
        c.user_email?.toLowerCase().includes(search)
      );
    }

    setFilteredChanges(filtered);
  }, [stockChanges, activeTab, selectedReferenceType, searchTerm]);

  const stats = useMemo(() => {
    if (!filteredChanges.length) return null;
    
    const totalChanges = filteredChanges.length;
    const increases = filteredChanges.filter(c => c.change_amount > 0);
    const decreases = filteredChanges.filter(c => c.change_amount < 0);
    const totalIncrease = increases.reduce((sum, c) => sum + c.change_amount, 0);
    const totalDecrease = Math.abs(decreases.reduce((sum, c) => sum + c.change_amount, 0));
    
    // PO fulfillments count
    const poFulfillments = filteredChanges.filter(c => c.reference_type === 'po_order').length;
    
    // Reference type breakdown
    const refTypeBreakdown = filteredChanges.reduce((acc, change) => {
      const type = change.reference_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalChanges,
      increases: increases.length,
      decreases: decreases.length,
      totalIncrease,
      totalDecrease,
      poFulfillments,
      refTypeBreakdown
    };
  }, [filteredChanges]);

  const getChangeIcon = (change: StockChange) => {
    if (change.change_amount > 0) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (change.change_amount < 0) return <TrendingDown className="w-4 h-4 text-rose-600" />;
    return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (open) {
      loadStockHistory();
    }
  }, [open, inventoryId]);

  // Get unique reference types for filter
  const referenceTypes = useMemo(() => {
    const types = new Set(stockChanges.map(c => c.reference_type).filter(Boolean));
    return Array.from(types);
  }, [stockChanges]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          Stock History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-primary" />
            Enhanced Stock History
          </DialogTitle>
          <div className="text-sm text-muted-foreground">{itemIdentifier}</div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading history...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
                <p className="text-destructive font-medium">Error loading stock history</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button variant="outline" size="sm" onClick={loadStockHistory} className="mt-3">
                  Try Again
                </Button>
              </div>
            </div>
          ) : stockChanges.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-amber-500" />
              <p className="text-muted-foreground font-medium text-lg">No Stock History</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                No changes have been recorded for this item yet
              </p>
            </div>
          ) : (
            <>
              {/* Filters Bar */}
              <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-2 rounded-lg">
                <Input
                  placeholder="Search reference, notes, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs h-8 text-sm"
                />
                <Select value={selectedReferenceType} onValueChange={setSelectedReferenceType}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {referenceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {REFERENCE_TYPE_LABELS[type]?.label || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchTerm || selectedReferenceType !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedReferenceType('all');
                    }}
                    className="h-8 text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Statistics Dashboard */}
              {stats && (
                <Card className="bg-gradient-to-r from-background to-muted/20">
                  <CardHeader className="p-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Statistics Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{stats.totalChanges}</div>
                        <div className="text-xs text-muted-foreground">Total Changes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">+{stats.totalIncrease}</div>
                        <div className="text-xs text-muted-foreground">Total Added</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-rose-600">-{stats.totalDecrease}</div>
                        <div className="text-xs text-muted-foreground">Total Removed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{stats.poFulfillments}</div>
                        <div className="text-xs text-muted-foreground">PO Fulfillments</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{stats.increases}</div>
                        <div className="text-xs text-muted-foreground">Increases</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs for grouping */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="all" className="text-xs">All ({stockChanges.length})</TabsTrigger>
                  <TabsTrigger value="po_order" className="text-xs">
                    PO ({stockChanges.filter(c => c.reference_type === 'po_order').length})
                  </TabsTrigger>
                  <TabsTrigger value="restock" className="text-xs">
                    Restocks ({stockChanges.filter(c => c.reference_type === 'restock').length})
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="text-xs">
                    Manual ({stockChanges.filter(c => c.reference_type === 'manual').length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-3">
                  <div className="space-y-2 pr-2">
                    {filteredChanges.map((change) => {
                      const refTypeInfo = REFERENCE_TYPE_LABELS[change.reference_type || ''] || REFERENCE_TYPE_LABELS.manual;
                      const isExpanded = expandedItems.has(change.id);
                      
                      return (
                        <Card key={change.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-start gap-2 flex-1">
                                {getChangeIcon(change)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${refTypeInfo.color}`}>
                                      <span>{refTypeInfo.icon}</span>
                                      {refTypeInfo.label}
                                    </span>
                                    {change.reference_number && (
                                      <Badge variant="outline" className="text-xs">
                                        {change.reference_number}
                                      </Badge>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(change.created_at), 'MMM dd, HH:mm')}
                                    </div>
                                  </div>
                                  {change.user_email && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      <User className="w-3 h-3" />
                                      {change.user_email}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge variant={change.change_amount > 0 ? "default" : "destructive"} className="ml-2">
                                {change.change_amount > 0 ? '+' : ''}{change.change_amount}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Previous</span>
                                <div className="font-medium">{change.previous_quantity}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">New</span>
                                <div className="font-medium">{change.new_quantity}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Reason</span>
                                <div className="font-medium truncate">{change.change_reason}</div>
                              </div>
                            </div>

                            {(change.fulfillment_source || change.notes || change.metadata) && (
                              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(change.id)}>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="w-full mt-2 h-6 text-xs">
                                    {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                                    {isExpanded ? 'Hide Details' : 'Show Details'}
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2 pt-2 border-t">
                                  <div className="space-y-2 text-xs">
                                    {change.fulfillment_source && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Source: </span>
                                        <Badge variant="secondary" className="text-xs">{change.fulfillment_source}</Badge>
                                      </div>
                                    )}
                                    {change.notes && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Notes: </span>
                                        <p className="text-foreground mt-1">{change.notes}</p>
                                      </div>
                                    )}
                                    {change.metadata && Object.keys(change.metadata).length > 0 && (
                                      <div>
                                        <span className="text-muted-foreground font-medium">Additional Info: </span>
                                        <div className="grid grid-cols-2 gap-1 mt-1 bg-muted/30 p-2 rounded">
                                          {Object.entries(change.metadata).map(([key, value]) => (
                                            <div key={key}>
                                              <span className="text-muted-foreground">{key}: </span>
                                              <span className="font-medium">{String(value)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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