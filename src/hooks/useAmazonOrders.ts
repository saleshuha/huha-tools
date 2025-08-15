import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Order, CreateOrder, DashboardMetrics } from '@/types/amazon-fulfillment';
import { useCountry } from '@/contexts/CountryContext';

export const useAmazonOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('country', selectedCountry)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      calculateMetrics(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching orders',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (ordersData: Order[]) => {
    const totalOrders = ordersData.length;
    const totalValue = ordersData.reduce((sum, order) => sum + order.item_cost * order.quantity, 0);
    
    const statusBreakdown = ordersData.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const paymentStatusBreakdown = ordersData.reduce((acc, order) => {
      acc[order.payment_status] = (acc[order.payment_status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const pendingPayments = ordersData.filter(o => o.payment_status === 'pending').length;
    const overduePayments = ordersData.filter(o => {
      if (!o.payment_due_date) return false;
      return new Date(o.payment_due_date) < new Date() && o.payment_status !== 'completed';
    }).length;
    const completedPayments = ordersData.filter(o => o.payment_status === 'completed').length;

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const upcomingPayments = {
      next7Days: ordersData.filter(o => 
        o.payment_due_date && 
        new Date(o.payment_due_date) <= next7Days && 
        new Date(o.payment_due_date) >= now &&
        o.payment_status !== 'completed'
      ).length,
      next30Days: ordersData.filter(o => 
        o.payment_due_date && 
        new Date(o.payment_due_date) <= next30Days && 
        new Date(o.payment_due_date) >= now &&
        o.payment_status !== 'completed'
      ).length,
      next90Days: ordersData.filter(o => 
        o.payment_due_date && 
        new Date(o.payment_due_date) <= next90Days && 
        new Date(o.payment_due_date) >= now &&
        o.payment_status !== 'completed'
      ).length,
    };

    setMetrics({
      totalOrders,
      totalValue,
      pendingPayments,
      overduePayments,
      completedPayments,
      statusBreakdown,
      paymentStatusBreakdown,
      upcomingPayments,
    });
  };

  const createOrder = async (orderData: CreateOrder) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          ...orderData,
          country: selectedCountry,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Order created successfully',
        description: `Order ${orderData.order_id} has been added`,
      });

      await fetchOrders();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error creating order',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Order updated successfully',
        description: 'Order has been updated',
      });

      await fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error updating order',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Order deleted successfully',
        description: 'Order has been removed',
      });

      await fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error deleting order',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const bulkImportOrders = async (ordersData: CreateOrder[]) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const formattedOrders = ordersData.map(order => ({
        ...order,
        country: selectedCountry,
        user_id: user?.id,
      }));

      const { data, error } = await supabase
        .from('orders')
        .insert(formattedOrders)
        .select();

      if (error) throw error;

      toast({
        title: 'Bulk import successful',
        description: `${data.length} orders imported successfully`,
      });

      await fetchOrders();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error importing orders',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedCountry]);

  return {
    orders,
    loading,
    metrics,
    createOrder,
    updateOrder,
    deleteOrder,
    bulkImportOrders,
    refetch: fetchOrders,
  };
};