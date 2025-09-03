import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NoonOrderEvent {
  id: string;
  user_id: string;
  noon_order_id: string;
  event_type: string;
  event_message: string;
  event_data: any;
  created_at: string;
}

export function useNoonOrderEvents(noonOrderId?: string) {
  const [events, setEvents] = useState<NoonOrderEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEvents = async (orderId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('noon_order_events')
        .select('*')
        .eq('noon_order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching order events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (
    orderId: string, 
    eventType: string, 
    message: string, 
    data: any = {}
  ) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('noon_order_events')
        .insert({
          user_id: user.id,
          noon_order_id: orderId,
          event_type: eventType,
          event_message: message,
          event_data: data,
        });

      if (error) throw error;
      
      // Refresh events after adding
      if (noonOrderId === orderId) {
        fetchEvents(orderId);
      }
    } catch (error) {
      console.error('Error adding order event:', error);
      toast({
        title: 'Error',
        description: 'Failed to log event',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (noonOrderId) {
      fetchEvents(noonOrderId);
    }
  }, [noonOrderId]);

  // Real-time subscription for events
  useEffect(() => {
    if (!noonOrderId) return;

    const channel = supabase
      .channel('noon-order-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'noon_order_events',
          filter: `noon_order_id=eq.${noonOrderId}`,
        },
        () => {
          fetchEvents(noonOrderId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noonOrderId]);

  return {
    events,
    loading,
    fetchEvents,
    addEvent,
  };
}