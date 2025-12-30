import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow, format } from 'date-fns';
import { Package, User, Calendar, Search, Filter, Clock, Truck, DollarSign, FileText } from 'lucide-react';

interface PurchaseUpdate {
  id: string;
  po_number: string;
  title: string;
  purchased_quantity: number;
  supplier_name?: string;
  supplier_order_number?: string;
  vendor_name?: string;
  vendor_email?: string;
  estimated_delivery_date?: string;
  unit_cost?: number;
  total_cost?: number;
  notes?: string;
  updated_at: string;
  metadata?: {
    not_available?: boolean;
  };
}

interface PurchaseUpdatesEnhancedPanelProps {
  poNumbers?: string[];
  linkId?: string;
}

export const PurchaseUpdatesPanel = ({ poNumbers, linkId }: PurchaseUpdatesEnhancedPanelProps) => {
  const [updates, setUpdates] = useState<PurchaseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'purchased' | 'not_available'>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  useEffect(() => {
    fetchUpdates();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('purchase-updates-panel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_updates',
        },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poNumbers, linkId]);

  const fetchUpdates = async () => {
    try {
      let query = supabase
        .from('purchase_updates')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (linkId) {
        query = query.eq('link_id', linkId);
      } else if (poNumbers && poNumbers.length > 0) {
        query = query.in('po_number', poNumbers);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching purchase updates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique vendors for filter
  const uniqueVendors = [...new Set(updates
    .filter(u => u.vendor_name)
    .map(u => u.vendor_name)
  )];

  // Filter updates
  const filteredUpdates = updates.filter(update => {
    const matchesSearch = 
      update.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'purchased' && (update.purchased_quantity || 0) > 0 && !update.metadata?.not_available) ||
      (statusFilter === 'not_available' && update.metadata?.not_available);
    
    const matchesVendor = 
      vendorFilter === 'all' || 
      update.vendor_name === vendorFilter;
    
    return matchesSearch && matchesStatus && matchesVendor;
  });

  if (loading) {
    return (
      <Card className="p-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (updates.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No purchase updates yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Purchase Updates
          </h3>
          <Badge variant="secondary">{filteredUpdates.length} of {updates.length}</Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search updates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="purchased">Purchased</SelectItem>
              <SelectItem value="not_available">Not Available</SelectItem>
            </SelectContent>
          </Select>
          
          {uniqueVendors.length > 0 && (
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {uniqueVendors.map(vendor => (
                  <SelectItem key={vendor} value={vendor!}>{vendor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Updates List */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredUpdates.map((update) => (
              <div key={update.id} className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors">
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{update.title || 'Untitled Item'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{update.po_number}</Badge>
                      {update.metadata?.not_available ? (
                        <Badge variant="destructive" className="text-xs">Not Available</Badge>
                      ) : (
                        <span className="font-medium text-foreground">Qty: {update.purchased_quantity}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(update.updated_at), { addSuffix: true })}
                  </Badge>
                </div>
                
                {/* Vendor info */}
                {(update.vendor_name || update.vendor_email) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    <User className="h-3 w-3" />
                    <span>{update.vendor_name || update.vendor_email}</span>
                    {update.vendor_email && update.vendor_name && (
                      <span className="text-muted-foreground/70">({update.vendor_email})</span>
                    )}
                  </div>
                )}

                {/* Supplier details */}
                {(update.supplier_name || update.supplier_order_number || update.estimated_delivery_date) && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {update.supplier_name && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {update.supplier_name}
                      </span>
                    )}
                    {update.supplier_order_number && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Order: {update.supplier_order_number}
                      </span>
                    )}
                    {update.estimated_delivery_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        ETA: {format(new Date(update.estimated_delivery_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                )}

                {/* Cost info */}
                {(update.unit_cost || update.total_cost) && (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {update.unit_cost && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Unit: ${update.unit_cost.toFixed(2)}
                      </span>
                    )}
                    {update.total_cost && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        Total: ${update.total_cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Notes */}
                {update.notes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 px-2 py-1 rounded">
                    {update.notes}
                  </p>
                )}
              </div>
            ))}

            {filteredUpdates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No updates match your filters</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};
