import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCountry } from '@/contexts/CountryContext';

export interface DailySoldItem {
  inventory_id: string;
  asin: string;
  sku: string | null;
  title: string | null;
  sold_today: number;
  remaining_stock: number;
  order_status: 'pending' | 'ordered' | 'skipped';
  ordered_at: string | null;
  sunsky_order_number: string | null;
  velocity_score: number;
  recommended_quantity: number;
}

export interface DailyOrderMetrics {
  totalSoldToday: number;
  itemsNeedingOrders: number;
  itemsOrdered: number;
  itemsSkipped: number;
  pendingFromPreviousDays: number;
}

export interface PreviousDayPending {
  date: string;
  count: number;
  items: DailySoldItem[];
}

export function useDailySalesOrders() {
  const [todaysSales, setTodaysSales] = useState<DailySoldItem[]>([]);
  const [previousDaysPending, setPreviousDaysPending] = useState<PreviousDayPending[]>([]);
  const [metrics, setMetrics] = useState<DailyOrderMetrics>({
    totalSoldToday: 0,
    itemsNeedingOrders: 0,
    itemsOrdered: 0,
    itemsSkipped: 0,
    pendingFromPreviousDays: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const loadTodaysSales = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      console.log('[DailySalesOrders] Calling RPC with:', { 
        target_date: today, 
        country_filter: selectedCountry 
      });
      
      const { data, error } = await supabase.rpc('get_daily_sold_items_needing_orders', {
        target_date: today,
        country_filter: selectedCountry
      });

      if (error) {
        console.error('[DailySalesOrders] RPC Error:', error);
        throw error;
      }

      console.log('[DailySalesOrders] RPC returned:', data?.length || 0, 'items');

      const items = (data || []) as DailySoldItem[];
      setTodaysSales(items);

      // Calculate metrics
      const totalSold = items.reduce((sum, item) => sum + item.sold_today, 0);
      const pending = items.filter(item => item.order_status === 'pending').length;
      const ordered = items.filter(item => item.order_status === 'ordered').length;
      const skipped = items.filter(item => item.order_status === 'skipped').length;

      setMetrics(prev => ({
        ...prev,
        totalSoldToday: totalSold,
        itemsNeedingOrders: pending,
        itemsOrdered: ordered,
        itemsSkipped: skipped
      }));

    } catch (error: any) {
      console.error('Error loading today\'s sales:', error);
      toast({
        title: "Error loading daily sales",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPreviousDays = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_order_tracking')
        .select('*')
        .eq('order_status', 'pending')
        .lt('sale_date', new Date().toISOString().split('T')[0])
        .order('sale_date', { ascending: false });

      if (error) throw error;

      const records = (data || []) as any[];

      // Group by date
      const grouped = records.reduce((acc: Record<string, any[]>, item) => {
        const date = item.sale_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push({
          inventory_id: item.inventory_id,
          asin: item.asin,
          sku: item.sku,
          title: item.title,
          sold_today: item.sold_quantity,
          remaining_stock: item.remaining_stock,
          order_status: item.order_status,
          ordered_at: item.ordered_at,
          sunsky_order_number: item.sunsky_order_number,
          velocity_score: 0,
          recommended_quantity: item.sold_quantity
        });
        return acc;
      }, {});

      const pendingByDate: PreviousDayPending[] = Object.entries(grouped).map(([date, items]) => ({
        date,
        count: (items as any[]).length,
        items: items as DailySoldItem[]
      }));

      setPreviousDaysPending(pendingByDate);
      
      const totalPending = pendingByDate.reduce((sum, day) => sum + day.count, 0);
      setMetrics(prev => ({ ...prev, pendingFromPreviousDays: totalPending }));

    } catch (error: any) {
      console.error('Error loading previous days pending:', error);
    }
  };

  const markAsOrdered = async (inventoryId: string, sunskyOrderNumber: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const item = todaysSales.find(i => i.inventory_id === inventoryId);
      
      if (!item) throw new Error('Item not found');

      const { error } = await supabase
        .from('daily_order_tracking')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          sale_date: today,
          inventory_id: inventoryId,
          asin: item.asin,
          sku: item.sku,
          title: item.title,
          sold_quantity: item.sold_today,
          remaining_stock: item.remaining_stock,
          order_status: 'ordered',
          ordered_at: new Date().toISOString(),
          sunsky_order_number: sunskyOrderNumber
        });

      if (error) throw error;

      await loadTodaysSales();
      
      toast({
        title: "Order marked",
        description: `${item.asin} marked as ordered`,
      });

    } catch (error: any) {
      console.error('Error marking as ordered:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const skipItem = async (inventoryId: string, reason?: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const item = todaysSales.find(i => i.inventory_id === inventoryId);
      
      if (!item) throw new Error('Item not found');

      const { error } = await supabase
        .from('daily_order_tracking')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          sale_date: today,
          inventory_id: inventoryId,
          asin: item.asin,
          sku: item.sku,
          title: item.title,
          sold_quantity: item.sold_today,
          remaining_stock: item.remaining_stock,
          order_status: 'skipped',
          skip_reason: reason
        });

      if (error) throw error;

      await loadTodaysSales();
      
      toast({
        title: "Item skipped",
        description: `${item.asin} skipped for today`,
      });

    } catch (error: any) {
      console.error('Error skipping item:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadTodaysSales();
    loadPendingPreviousDays();
  }, [selectedCountry]);

  return {
    todaysSales,
    previousDaysPending,
    metrics,
    loading,
    loadTodaysSales,
    loadPendingPreviousDays,
    markAsOrdered,
    skipItem
  };
}
