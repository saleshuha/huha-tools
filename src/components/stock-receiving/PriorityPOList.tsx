import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { POPriorityBadge } from '@/components/po/POPriorityBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PO {
  id: string;
  po_number: string;
  status: string;
  priority: number;
  quantity: number;
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  expected_delivery?: string;
}

export function PriorityPOList() {
  const [pos, setPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadPOs();
  }, []);

  const loadPOs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get open POs grouped by PO number with aggregated quantities
      const { data, error } = await supabase
        .from('po_orders')
        .select('id, po_number, status, priority, quantity, asin, sku_code, model_number, title, expected_delivery')
        .eq('user_id', user.id)
        .in('status', ['pending', 'placed'])
        .order('priority', { ascending: true })
        .order('expected_delivery', { ascending: true });

      if (error) throw error;

      // Group by PO number and sum quantities
      const grouped = (data || []).reduce((acc: any, po: any) => {
        const key = po.po_number;
        if (!acc[key]) {
          acc[key] = { ...po, quantity: 0, items: [] };
        }
        acc[key].quantity += po.quantity;
        acc[key].items.push(po);
        // Use the highest priority (lowest number) for the group
        if (!acc[key].priority || po.priority < acc[key].priority) {
          acc[key].priority = po.priority || 3;
        }
        return acc;
      }, {});

      setPOs(Object.values(grouped));
    } catch (error) {
      console.error('Failed to load POs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load purchase orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityUpdate = async (poNumber: string, newPriority: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update all items with this PO number
      const { error } = await supabase
        .from('po_orders')
        .update({ priority: newPriority })
        .eq('po_number', poNumber)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated priority for PO ${poNumber}`,
      });

      // Reload to reflect changes
      await loadPOs();
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive'
      });
    }
  };

  const handleBulkPriorityUpdate = async (newPriority: number) => {
    if (selectedPOs.size === 0) {
      toast({
        title: 'No POs selected',
        description: 'Please select POs to update',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all selected PO numbers
      const selectedPONumbers = Array.from(selectedPOs);

      // Update all items for selected PO numbers
      const { error } = await supabase
        .from('po_orders')
        .update({ priority: newPriority })
        .in('po_number', selectedPONumbers)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated priority for ${selectedPOs.size} PO(s)`,
      });

      setSelectedPOs(new Set());
      await loadPOs();
    } catch (error) {
      console.error('Failed to bulk update priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update priorities',
        variant: 'destructive'
      });
    }
  };

  const togglePOSelection = (poNumber: string) => {
    setSelectedPOs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(poNumber)) {
        newSet.delete(poNumber);
      } else {
        newSet.add(poNumber);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPOs.size === filteredPOs.length) {
      setSelectedPOs(new Set());
    } else {
      setSelectedPOs(new Set(filteredPOs.map(po => po.po_number)));
    }
  };

  const filteredPOs = pos.filter(po => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(query) ||
      po.asin?.toLowerCase().includes(query) ||
      po.sku_code?.toLowerCase().includes(query) ||
      po.title?.toLowerCase().includes(query)
    );
  });

  const allSelected = selectedPOs.size === filteredPOs.length && filteredPOs.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Priority PO Management
            </CardTitle>
            <CardDescription>
              Set priorities for purchase orders to control fulfillment order
            </CardDescription>
          </div>
          {selectedPOs.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedPOs.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkPriorityUpdate(1)}
              >
                Set Highest
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkPriorityUpdate(2)}
              >
                Set High
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkPriorityUpdate(3)}
              >
                Set Normal
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number, ASIN, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPOs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No POs match your search' : 'No open purchase orders'}
          </div>
        )}

        {/* PO List */}
        {!loading && filteredPOs.length > 0 && (
          <div className="space-y-2">
            {/* Select All Header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="h-auto p-0"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </Button>
              <span className="text-sm font-medium">
                Select All ({filteredPOs.length})
              </span>
            </div>

            {/* PO Items */}
            {filteredPOs.map((po) => (
              <div
                key={po.po_number}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                  selectedPOs.has(po.po_number)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                )}
              >
                <Checkbox
                  checked={selectedPOs.has(po.po_number)}
                  onCheckedChange={() => togglePOSelection(po.po_number)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {po.po_number}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {po.status.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {po.quantity} items
                    </Badge>
                  </div>
                  
                  {po.title && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {po.title}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {po.asin && <span>ASIN: {po.asin}</span>}
                    {po.sku_code && <span>• SKU: {po.sku_code}</span>}
                    {po.expected_delivery && (
                      <span>• Expected: {new Date(po.expected_delivery).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <POPriorityBadge
                  priority={po.priority || 3}
                  onUpdate={(newPriority) => handlePriorityUpdate(po.po_number, newPriority)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Info Message */}
        {!loading && filteredPOs.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>How it works:</strong> When receiving items through the search bar above, 
              higher priority POs (⚡ Highest, 🔴 High) will be fulfilled first automatically. 
              This ensures urgent orders are completed before others.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
