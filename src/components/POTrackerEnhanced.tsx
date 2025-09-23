// Enhanced POTracker component with modern UI improvements
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle, Clock, FileUp, Search, Filter, Package, TrendingUp, ShoppingCart, Truck, DollarSign, X, Plus, Edit2, ExternalLink, Loader2, BarChart3, Download, RefreshCw, Printer, Zap, Image as ImageIcon, CheckSquare, Square, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { POFileUpload } from '@/components/po/POFileUpload';
import { POProfitAnalytics } from '@/components/po/POProfitAnalytics';
import { POReportsSection } from '@/components/po/POReportsSection';
import { qzConnectionManager } from '@/utils/qz-connection-manager';
import { usePOOrders } from '@/hooks/usePOOrders';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCountry } from '@/contexts/CountryContext';
import { useProductImages } from '@/hooks/useProductImages';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PrintService } from '@/services/print-service';
import { LabelDoc, LabelDataset, LabelElement, LabelSize } from '@/types/label';
import { HuhaTab01 } from '@/components/ui/huha-tab-01';

interface POOrder {
  id: string;
  user_id: string;
  po_number: string;
  ship_to_location?: string;
  asin?: string;
  model_number?: string;
  title?: string;
  quantity: number;
  printed_quantity?: number;
  external_id?: string;
  external_id_type?: string;
  sku_code?: string;
  status: 'pending' | 'placed' | 'received' | 'cancelled' | 'closed';
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
  is_printed?: boolean;
  sunsky_sku?: any;
}

export const POTrackerEnhanced = () => {
  const { selectedCountry } = useCountry();
  const navigate = useNavigate();
  const { poOrders, isLoading, fetchPOOrders } = usePOOrders();
  const { refreshImages, isLoading: imagesLoading } = useProductImages();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch comprehensive metrics
  const { data: comprehensiveMetrics, isLoading: isLoadingComprehensiveMetrics } = useQuery({
    queryKey: ['po-comprehensive-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_po_dashboard_summary', {
        user_id_param: user.id
      });

      if (error) {
        console.error('Error fetching metrics:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      return data?.[0] || null;
    },
    enabled: !!profile?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Enhanced Header Component
  const EnhancedHeader = () => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-sm border border-border/30 shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-50"></div>
      <div className="relative p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg"></div>
              <div className="relative p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 shadow-glow">
                <ShoppingCart className="h-10 w-10 text-primary drop-shadow-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-sm">
                Purchase Order Dashboard
              </h1>
              <p className="text-lg text-muted-foreground/80 font-medium">
                Monitor and manage your purchase orders across all suppliers with advanced analytics
              </p>
              {selectedCountry && (
                <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/20">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    {selectedCountry}
                  </div>
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPOOrders()}
              disabled={isLoading}
              className="gap-2 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/30 shadow-soft hover:shadow-glow transition-all duration-300"
            >
              <RefreshCw 
                className="h-4 w-4 animate-spin" 
                style={{ animationPlayState: isLoading ? 'running' : 'paused' }} 
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshImages()}
              disabled={imagesLoading}
              className="gap-2 bg-background/50 hover:bg-background/80 border-border/50 hover:border-accent/30 shadow-soft hover:shadow-accent-glow transition-all duration-300"
            >
              <ImageIcon 
                className="h-4 w-4 animate-spin" 
                style={{ animationPlayState: imagesLoading ? 'running' : 'paused' }} 
              />
              Images
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/sunsky-sku-importer')}
              className="gap-2 bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 border-accent/30 hover:border-accent/50 text-accent-foreground shadow-soft hover:shadow-accent-glow transition-all duration-300"
            >
              <Zap className="h-4 w-4" />
              Sunsky Import
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced Overview Metrics
  const EnhancedOverview = () => (
    <div className="space-y-8 animate-fade-in">
      {isLoadingComprehensiveMetrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/30 p-6 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/50 rounded-lg"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-muted/50 rounded w-16"></div>
                  <div className="h-6 bg-muted/50 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : comprehensiveMetrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 animate-fade-in">
          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total POs</p>
                  <p className="text-2xl font-bold text-blue-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.total_pos || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total SKUs</p>
                  <p className="text-2xl font-bold text-green-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.total_skus || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold text-purple-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.total_quantity?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold text-orange-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.total_value 
                      ? `$${Number(comprehensiveMetrics.total_value).toLocaleString('en-US', { 
                          minimumFractionDigits: 0, 
                          maximumFractionDigits: 0 
                        })}` 
                      : '$0'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                  <Clock className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-cyan-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.pending_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                  <Truck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Placed</p>
                  <p className="text-2xl font-bold text-emerald-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.placed_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                  <CheckCircle className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Received</p>
                  <p className="text-2xl font-bold text-indigo-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.received_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/5 via-background to-background/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Closed</p>
                  <p className="text-2xl font-bold text-red-600 group-hover:scale-105 transition-transform">
                    {comprehensiveMetrics.closed_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Enhanced Data Tables */}
      <Card className="shadow-soft border-border/50 bg-gradient-to-b from-card to-card/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/30">
          <CardTitle className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Purchase Orders Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Detailed order management coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const tabItems = [
    {
      value: 'overview',
      label: 'Overview',
      content: <EnhancedOverview />
    },
    {
      value: 'uploads',
      label: 'Uploads',  
      content: (
        <Card className="shadow-soft border-border/50">
          <CardContent className="p-8">
            <POFileUpload />
          </CardContent>
        </Card>
      )
    },
    {
      value: 'print-labels',
      label: 'Print Labels',
      content: (
        <Card className="shadow-soft border-border/50">
          <CardContent className="p-8">
            <div className="text-center py-12 text-muted-foreground">
              <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Label printing functionality coming soon...</p>
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      value: 'reports',
      label: 'Reports',
      content: (
        <Card className="shadow-soft border-border/50">
          <CardContent className="p-8">
            <POReportsSection 
              poOrders={poOrders || []}
              inventoryData={[]}
              skuInventoryData={[]}
            />
          </CardContent>
        </Card>
      )
    },
    {
      value: 'close-po',
      label: 'Close PO',
      content: (
        <Card className="shadow-soft border-border/50">
          <CardContent className="p-8">
            <div className="text-center py-12 text-muted-foreground">
              <X className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>PO closing functionality coming soon...</p>
            </div>
          </CardContent>
        </Card>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8 animate-fade-in">
        <EnhancedHeader />
        
        <HuhaTab01
          items={tabItems}
          value={activeTab}
          onValueChange={setActiveTab}
          className="animate-fade-in"
        />
      </div>
    </div>
  );
};