import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Order, CreateOrder, DashboardMetrics } from '@/types/amazon-fulfillment';
import { useCountry } from '@/contexts/CountryContext';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';

export const useAmazonOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const { creditDays } = usePaymentTerms();

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
          .order('shipment_date', { ascending: true }) // Changed to shipment_date ascending to get older orders first
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
        paidPayments: 0,
        paidValue: 0,
        pendingPayments: 0,
        pendingValue: 0,
        overduePayments: 0,
        overdueValue: 0,
        completedPayments: 0,
        paidThroughDate: null,
        statusBreakdown: {},
        paymentStatusBreakdown: {},
        upcomingPayments: { next7Days: 0, next30Days: 0, next90Days: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (ordersData: Order[]) => {
    console.log('🔍 Overdue Debug - Calculating metrics for orders:', ordersData.length);
    console.log('🔍 Overdue Debug - Using credit days:', creditDays, 'for country:', selectedCountry);
    
    const now = new Date();
    console.log('🔍 Overdue Debug - Current date for overdue calculation:', now.toDateString());
    
    if (!ordersData || ordersData.length === 0) {
      setMetrics({
        totalOrders: 0,
        totalValue: 0,
        paidPayments: 0,
        paidValue: 0,
        pendingPayments: 0,
        pendingValue: 0,
        overduePayments: 0,
        overdueValue: 0,
        completedPayments: 0,
        paidThroughDate: null,
        statusBreakdown: {},
        paymentStatusBreakdown: {},
        upcomingPayments: { next7Days: 0, next30Days: 0, next90Days: 0 }
      });
      return;
    }

    const totalOrders = ordersData.length;
    
    // Helper function to convert currency to USD with correct exchange rates
    const convertToUSD = (amount: number, currency: string): number => {
      if (!currency || currency === 'USD') return amount;
      
      // Use proper exchange rates
      const exchangeRates: Record<string, number> = {
        'AED': 0.272, // 1 AED = 0.272 USD
        'SAR': 0.267, // 1 SAR = 0.267 USD
        'USD': 1.0
      };
      
      return amount * (exchangeRates[currency] || 1.0);
    };
    
    // Calculate total value - convert all to USD for consistent calculations
    const totalValue = ordersData.reduce((sum, order) => {
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValue = cost * qty;
      
      // Convert to USD for consistent calculations
      return sum + convertToUSD(orderValue, order.currency || 'USD');
    }, 0);
    
    console.log('Total value calculated (all converted to USD):', totalValue);
    console.log('Order breakdown by currency:', ordersData.reduce((acc, order) => {
      const curr = order.currency || 'USD';
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    
    const statusBreakdown = ordersData.reduce((acc, order) => {
      const status = order.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Current timestamp for date calculations
    // Pending payments = orders with status "Approved" or "Non Submitted" (case insensitive)
    const pendingOrders = ordersData.filter(o => {
      const status = (o.status || '').toLowerCase().trim();
      return status === 'approved' || status === 'non submitted' || status === 'non-submitted';
    });
    const pendingPayments = pendingOrders.length;

    // Calculate pending orders value (convert to USD)
    const pendingValue = pendingOrders.reduce((sum, order) => {
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValue = cost * qty;
      
      // Convert to USD for consistent calculations
      return sum + convertToUSD(orderValue, order.currency || 'USD');
    }, 0);
    
    console.log('Pending payments (Approved + Non-submitted):', pendingPayments);
    console.log('Sample pending orders:', pendingOrders.slice(0, 3).map(o => ({ 
      status: o.status, 
      order_id: o.order_id, 
      invoice_date: o.invoice_date 
    })));

    // Overdue payments = pending orders past due date (shipment_date + credit days < today)
    const overdueOrders = pendingOrders.filter(o => {
      if (!o.shipment_date) return false;
      
      try {
        const shipmentDate = new Date(o.shipment_date);
        const dueDate = new Date(shipmentDate);
        // Calculate payment due date based on actual payment terms from database
        dueDate.setDate(dueDate.getDate() + creditDays);
        const isOverdue = dueDate <= now;
        
        // Enhanced logging for debugging
        console.log(`Order ${o.order_id}: Shipment: ${o.shipment_date}, Due: ${dueDate.toDateString()}, Credit Days: ${creditDays}, Is Overdue: ${isOverdue}`);
        
        if (isOverdue) {
          console.log(`✓ OVERDUE: ${o.order_id}, Shipment: ${o.shipment_date}, Due: ${dueDate.toDateString()} (${creditDays} days)`);
        } else {
          // Log why it's not overdue for debugging  
          console.log(`❌ Not overdue: ${o.order_id}, Due: ${dueDate.toDateString()}, Now: ${now.toDateString()}`);
        }
        
        return isOverdue;
      } catch (error) {
        console.error('Error parsing shipment date:', o.shipment_date, error);
        return false;
      }
    });
    const overduePayments = overdueOrders.length;

    console.log('🔍 Total overdue orders found:', overdueOrders.length);
    console.log(`🔍 Expected ~137 overdue orders based on database query (shipment dates before ${new Date(new Date().getTime() - (creditDays * 24 * 60 * 60 * 1000)).toDateString()})`);
    
    if (overdueOrders.length > 0) {
      console.log('🔍 Sample overdue orders:', overdueOrders.slice(0, 5).map(o => ({
        order_id: o.order_id,
        shipment_date: o.shipment_date,
        due_date: new Date(new Date(o.shipment_date).getTime() + (creditDays * 24 * 60 * 60 * 1000)).toDateString()
      })));
    } else {
      console.log('🔍 No overdue orders found. Check if older orders (July 2025) are being processed.');
      console.log('🔍 First 5 pending orders being checked:', pendingOrders.slice(0, 5).map(o => ({
        order_id: o.order_id,
        shipment_date: o.shipment_date,
        status: o.status
      })));
    }

    // Calculate overdue orders value (convert to USD)
    const overdueValue = overdueOrders.reduce((sum, order) => {
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValue = cost * qty;
      
      // Convert to USD for consistent calculations
      return sum + convertToUSD(orderValue, order.currency || 'USD');
    }, 0);
    
    console.log('Overdue payments count:', overduePayments);
    
    // Paid payments = orders with payment_status "completed" or status "Paid"
    const paidOrders = ordersData.filter(o => {
      const paymentStatus = (o.payment_status || '').toLowerCase().trim();
      const status = (o.status || '').toLowerCase().trim();
      return paymentStatus === 'completed' || status === 'paid';
    });
    const paidPayments = paidOrders.length;

    // Calculate paid orders value (convert to USD)
    const paidValue = paidOrders.reduce((sum, order) => {
      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValue = cost * qty;
      
      // Convert to USD for consistent calculations
      return sum + convertToUSD(orderValue, order.currency || 'USD');
    }, 0);
    
    // Completed payments = orders with payment_status "completed" or status "Paid"
    const completedPayments = paidPayments; // Same as paid payments

    // Payment status breakdown for display
    const paymentStatusBreakdown = {
      pending: pendingPayments,
      overdue: overduePayments,
      completed: completedPayments,
      paid: paidPayments
    };

    // Calculate upcoming payments based on shipment_date + credit days from database
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const upcomingPayments = {
      next7Days: pendingOrders.filter(o => {
        if (!o.shipment_date) return false;
        
        try {
          const shipmentDate = new Date(o.shipment_date);
          const dueDate = new Date(shipmentDate);
          dueDate.setDate(dueDate.getDate() + creditDays);
          return dueDate <= next7Days && dueDate > now;
        } catch {
          return false;
        }
      }).length,
      next30Days: pendingOrders.filter(o => {
        if (!o.shipment_date) return false;
        
        try {
          const shipmentDate = new Date(o.shipment_date);
          const dueDate = new Date(shipmentDate);
          dueDate.setDate(dueDate.getDate() + creditDays);
          return dueDate <= next30Days && dueDate > now;
        } catch {
          return false;
        }
      }).length,
      next90Days: pendingOrders.filter(o => {
        if (!o.shipment_date) return false;
        
        try {
          const shipmentDate = new Date(o.shipment_date);
          const dueDate = new Date(shipmentDate);
          dueDate.setDate(dueDate.getDate() + creditDays);
          return dueDate <= next90Days && dueDate > now;
        } catch {
          return false;
        }
      }).length,
    };

    // Calculate "paid through" date - latest date where all orders before it are paid
    let paidThroughDate: string | null = null;
    
    if (ordersData.length > 0) {
      // Sort orders by invoice date
      const sortedOrders = [...ordersData]
        .filter(o => o.invoice_date) // Only orders with invoice dates
        .sort((a, b) => new Date(a.invoice_date!).getTime() - new Date(b.invoice_date!).getTime());
      
      // Find the latest date where all orders up to that date are paid
      for (let i = sortedOrders.length - 1; i >= 0; i--) {
        const currentOrder = sortedOrders[i];
        const currentDate = currentOrder.invoice_date!;
        
        // Check if all orders up to this date are paid
        const ordersUpToThisDate = sortedOrders.slice(0, i + 1);
        const allPaid = ordersUpToThisDate.every(order => {
          const paymentStatus = (order.payment_status || '').toLowerCase().trim();
          const status = (order.status || '').toLowerCase().trim();
          return paymentStatus === 'completed' || status === 'paid';
        });
        
        if (allPaid) {
          paidThroughDate = currentDate;
          break;
        }
      }
    }

    const finalMetrics = {
      totalOrders,
      totalValue, // Keep in original currency, no conversion
      paidPayments,
      paidValue, // Keep in original currency, no conversion
      pendingPayments,
      pendingValue, // Keep in original currency, no conversion
      overduePayments,
      overdueValue, // Keep in original currency, no conversion
      completedPayments,
      paidThroughDate,
      statusBreakdown,
      paymentStatusBreakdown,
      upcomingPayments,
    };
    
    console.log('Final metrics:', finalMetrics);
    setMetrics(finalMetrics);
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

      // First, fetch all existing orders to compare
      console.log('Fetching existing orders for duplicate detection...');
      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('order_id, id, status, payment_status, updated_at')
        .eq('country', selectedCountry)
        .eq('user_id', user?.id);

      if (fetchError) {
        console.warn('Error fetching existing orders:', fetchError);
      }

      const existingOrdersMap = new Map(
        (existingOrders || []).map(order => [order.order_id, order])
      );

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
          existingOrdersMap.clear(); // Clear the map since we deleted all data
        }
      }

      // Format orders and handle payment due date calculation
      const formattedOrders = ordersData.map(order => {
        const existingOrder = existingOrdersMap.get(order.order_id);
        
        // Calculate payment due date if invoice date is provided
        let paymentDueDate = null;
        if (order.invoice_date && order.payment_schedule_days) {
          const invoiceDate = new Date(order.invoice_date);
          paymentDueDate = new Date(invoiceDate);
          paymentDueDate.setDate(paymentDueDate.getDate() + order.payment_schedule_days);
        }

        return {
          ...order,
          country: selectedCountry,
          user_id: user?.id,
          payment_due_date: paymentDueDate?.toISOString().split('T')[0] || null,
          // Preserve existing payment status if order exists and is already paid
          payment_status: existingOrder?.payment_status === 'completed' 
            ? existingOrder.payment_status 
            : order.payment_status || 'pending',
          // Set payment schedule days default
          payment_schedule_days: order.payment_schedule_days || 45,
        };
      });

      console.log(`Processing ${formattedOrders.length} orders...`);
      console.log(`Found ${existingOrdersMap.size} existing orders in database`);

      // Use upsert to handle duplicates - update if order_id exists, insert if new
      const { data, error } = await supabase
        .from('orders')
        .upsert(formattedOrders, {
          onConflict: 'order_id,user_id,country',
          ignoreDuplicates: false // This ensures we update existing records
        })
        .select();

      if (error) throw error;

      // Calculate statistics
      const newOrders = formattedOrders.filter(order => !existingOrdersMap.has(order.order_id));
      const updatedOrders = formattedOrders.filter(order => existingOrdersMap.has(order.order_id));
      
      console.log(`Import results: ${newOrders.length} new orders, ${updatedOrders.length} updated orders`);

      toast({
        title: 'Import completed successfully',
        description: `${newOrders.length} new orders imported. ${updatedOrders.length} existing orders updated. ${clearOldData ? 'Previous data cleared.' : ''}`,
      });

      await fetchOrders();
      return data;
    } catch (error: any) {
      console.error('Import error:', error);
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