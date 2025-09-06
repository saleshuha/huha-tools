import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HuhaTab01 } from '@/components/ui/huha-tab-01';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, FileUp, Search, Filter, Package, TrendingUp, ShoppingCart, Truck, DollarSign, X, Plus, Edit2, ExternalLink, Loader2, BarChart3, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { POFileUpload } from '@/components/po/POFileUpload';
import { POProfitAnalytics } from '@/components/po/POProfitAnalytics';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export interface POOrder {
  id: string;
  user_id: string;
  po_number: string;
  ship_to_location?: string;
  asin?: string;
  model_number?: string;
  title?: string;
  quantity: number;
  external_id?: string;
  external_id_type?: string;
  sku_code?: string;
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'closed' | 'partial-fulfilled';
  order_date?: string;
  expected_delivery?: string;
  notes?: string;
  file_name: string;
  country?: string;
  currency?: string;
  unit_cost?: number;
  total_cost?: number;
  sku_user_id?: string;
  supplier_order_number?: string;
  tracking_number?: string;
  tracking_url?: string;
  created_at: string;
  updated_at: string;
  sunsky_sku?: any;
}

interface POGroup {
  poNumber: string;
  orders: POOrder[];
}

export const POTracker = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<POOrder['status'] | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const { poOrders, isLoading, fetchPOOrders, processPOFiles, deletePOOrders } = usePOOrders();
  const { profile } = useUserProfile();
  const { selectedCountry } = useCountry();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAllPO = async () => {
    await deletePOOrders();
  };

  const { data: comprehensiveMetrics, isLoading: isLoadingComprehensiveMetrics, refetch: refetchComprehensiveMetrics } = useQuery({
    queryKey: ['po-comprehensive-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_po_dashboard_summary', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching metrics:', error);
        throw error;
      }

      return data?.[0] || null;
    },
  });

  // Group orders by PO number
  const groupedPOOrders = useMemo(() => {
    const grouped = poOrders.reduce((acc, order) => {
      if (!acc[order.po_number]) {
        acc[order.po_number] = [];
      }
      acc[order.po_number].push(order);
      return acc;
    }, {} as Record<string, POOrder[]>);

    return Object.entries(grouped).map(([poNumber, orders]) => ({
      poNumber,
      orders: orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }));
  }, [poOrders]);

  // Filter logic
  const filteredOrders = useMemo(() => {
    return poOrders.filter(order => {
      const matchesSearch = !searchQuery || 
        order.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.asin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.external_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [poOrders, searchQuery, statusFilter]);

  const filteredPOGroups = useMemo(() => {
    return groupedPOOrders.filter(group => {
      return group.orders.some(order => {
        const matchesSearch = !searchQuery || 
          order.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.asin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.external_id?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });
    });
  }, [groupedPOOrders, searchQuery, statusFilter]);

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedPOGroups = useMemo(() => {
    return filteredPOGroups.slice(startIndex, endIndex);
  }, [filteredPOGroups, startIndex, endIndex]);

  const paginatedDetailedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  const overviewContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Package className="h-5 w-5" />
              {viewMode === 'grouped' ? 'Unique PO Numbers' : 'Total Line Items'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {viewMode === 'grouped' ? 
                (comprehensiveMetrics?.unique_po_numbers || groupedPOOrders.length) :
                (comprehensiveMetrics?.total_active_orders || poOrders.length)
              }
            </div>
            <div className="text-sm text-muted-foreground">
              {viewMode === 'grouped' ? 
                `Line Items: ${comprehensiveMetrics?.total_active_orders || poOrders.length}` :
                `Qty: ${comprehensiveMetrics?.total_active_quantity || poOrders.reduce((sum, order) => sum + (order.quantity || 0), 0)}`
              }
            </div>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'grouped' ? 'Unique POs with total line items' : 'All line items across POs'}
            </p>
            {isLoadingComprehensiveMetrics && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading metrics...</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Add other metric cards here */}
      </div>
      
      {/* Add table content here */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add filters and table */}
          <p>PO data will be displayed here</p>
        </CardContent>
      </Card>
    </div>
  );

  const uploadContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <POFileUpload 
            onFilesUpload={() => {}}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );

  const profitContent = (
    <div className="space-y-6">
      <POProfitAnalytics poOrders={poOrders} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Purchase Order Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage your purchase orders across all suppliers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => fetchPOOrders()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <HuhaTab01
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            value: "overview",
            label: "PO Overview",
            content: overviewContent
          },
          {
            value: "upload", 
            label: "Uploads",
            content: uploadContent
          },
          {
            value: "profit",
            label: "Profit Analysis", 
            content: profitContent
          }
        ]}
      />
    </div>
  );
};