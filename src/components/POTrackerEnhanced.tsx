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

// Import the original POTracker to reuse all its logic
import { POTracker as OriginalPOTracker } from './POTracker';

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
  const { fetchPOOrders, isLoading } = usePOOrders();
  const { refreshImages, isLoading: imagesLoading } = useProductImages();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8 animate-fade-in">
        <EnhancedHeader />
        
        {/* Embed the original POTracker with enhanced styling context */}
        <div className="space-y-6">
          <OriginalPOTracker />
        </div>
      </div>
    </div>
  );
};