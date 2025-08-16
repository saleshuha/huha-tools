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
      setLoading(true);
      
      // Fetch all orders without any limit
      let allOrders = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('country', selectedCountry)
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allOrders = [...allOrders, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      const validOrders = (allOrders || []).filter(order => 
        order && order.id && order.order_id
      );
      
      setOrders(validOrders);
      calculateMetrics(validOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error fetching orders',
        description: error.message,
        variant: 'destructive',
      });
      setOrders([]);
      setMetrics({
        totalOrders: 0,
        totalValue: 0,
        pendingPayments: 0,
        overduePayments: 0,
        completedPayments: 0,
        statusBreakdown: {},
        paymentStatusBreakdown: {},
        upcomingPayments: { next7Days: 0, next30Days: 0, next90Days: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (ordersData: Order[]) => {
    if (!ordersData || ordersData.length === 0) {
      setMetrics({
        totalOrders: 0,
        totalValue: 0,
        pendingPayments: 0,
        overduePayments: 0,
        completedPayments: 0,
        statusBreakdown: {},
        paymentStatusBreakdown: {},
        upcomingPayments: { next7Days: 0, next30Days: 0, next90Days: 0 }
      });
      return;
    }

    const totalOrders = ordersData.length;
    
    // Calculate total value in USD (all orders are stored in USD)
    const totalValue = ordersData.reduce((sum, order) => {
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      return sum + (cost * qty);
    }, 0);
    
    const statusBreakdown = ordersData.reduce((acc, order) => {
      const status = order.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const paymentStatusBreakdown = ordersData.reduce((acc, order) => {
      const paymentStatus = order.payment_status || 'unknown';
      acc[paymentStatus] = (acc[paymentStatus] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Calculate payment metrics based on invoice_date + 45 days
    const now = new Date();
    const pendingPayments = ordersData.filter(o => o.payment_status === 'pending').length;
    
    const overduePayments = ordersData.filter(o => {
      if (!o.invoice_date || o.payment_status === 'completed') return false;
      try {
        const invoiceDate = new Date(o.invoice_date);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 45); // Add 45 days to invoice date
        return dueDate < now && o.payment_status === 'pending';
      } catch {
        return false;
      }
    }).length;
    
    const completedPayments = ordersData.filter(o => o.payment_status === 'completed').length;

    // Calculate upcoming payments based on invoice_date + 45 days
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const upcomingPayments = {
      next7Days: ordersData.filter(o => {
        if (!o.invoice_date || o.payment_status === 'completed') return false;
        try {
          const invoiceDate = new Date(o.invoice_date);
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + 45);
          return dueDate <= next7Days && dueDate >= now && o.payment_status === 'pending';
        } catch {
          return false;
        }
      }).length,
      next30Days: ordersData.filter(o => {
        if (!o.invoice_date || o.payment_status === 'completed') return false;
        try {
          const invoiceDate = new Date(o.invoice_date);
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + 45);
          return dueDate <= next30Days && dueDate >= now && o.payment_status === 'pending';
        } catch {
          return false;
        }
      }).length,
      next90Days: ordersData.filter(o => {
        if (!o.invoice_date || o.payment_status === 'completed') return false;
        try {
          const invoiceDate = new Date(o.invoice_date);
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + 45);
          return dueDate <= next90Days && dueDate >= now && o.payment_status === 'pending';
        } catch {
          return false;
        }
      }).length,
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

  const bulkImportOrders = async (ordersData: CreateOrder[], clearOldData: boolean = false) => {
    try {
      setLoading(true);
      const user = (await supabase.auth.getUser()).data.user;

      // Clear existing data if requested
      if (clearOldData) {
        const { error: deleteError } = await supabase
          .from('orders')
          .delete()
          .eq('country', selectedCountry)
          .eq('user_id', user?.id);

        if (deleteError) {
          console.warn('Error clearing existing data:', deleteError);
        } else {
          console.log(`Cleared existing data for ${selectedCountry}`);
        }
      }

      const formattedOrders = ordersData.map(order => ({
        ...order,
        country: selectedCountry,
        user_id: user?.id,
      }));

      // Use upsert to handle duplicates - update if order_id exists, insert if new
      const { data, error } = await supabase
        .from('orders')
        .upsert(formattedOrders, {
          onConflict: 'order_id,user_id,country',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;

      const successCount = data?.length || 0;
      const duplicateCount = ordersData.length - successCount;

      toast({
        title: 'Import completed successfully',
        description: `${successCount} orders processed. ${duplicateCount > 0 ? `${duplicateCount} orders updated (duplicates).` : ''} ${clearOldData ? 'Previous data cleared.' : ''}`,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedCountry]);

  const clearAllOrders = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('country', selectedCountry)
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all user orders

      if (error) throw error;

      toast({
        title: 'All orders cleared',
        description: 'All orders have been removed for testing',
      });

      await fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error clearing orders',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    orders,
    loading,
    metrics,
    createOrder,
    updateOrder,
    deleteOrder,
    bulkImportOrders,
    clearAllOrders,
    refetch: fetchOrders,
  };
};