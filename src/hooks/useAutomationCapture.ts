import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CaptureEvent {
  id: string;
  user_id: string;
  config_id?: string;
  site_url?: string;
  site_origin?: string;
  css?: string;
  xpath?: string;
  tag?: string;
  inner_text?: string;
  attributes?: any;
  created_at: string;
  mapped_field?: string;
}

export const useAutomationCapture = () => {
  const [captureEvents, setCaptureEvents] = useState<CaptureEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCaptureEvents = async (limit = 100) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_capture_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setCaptureEvents((data || []) as CaptureEvent[]);
    } catch (error) {
      console.error('Error fetching capture events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch captured elements",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const mapElementToField = async (eventId: string, fieldKey: string, configId?: string) => {
    try {
      // Update the capture event with the mapped field
      const { error: updateError } = await supabase
        .from('automation_capture_events')
        .update({ 
          mapped_field: fieldKey,
          config_id: configId 
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      // If we have a config ID, also update the config with this selector
      if (configId) {
        const event = captureEvents.find(e => e.id === eventId);
        if (event) {
          const { data: config, error: fetchError } = await supabase
            .from('automation_configs')
            .select('fields')
            .eq('id', configId)
            .single();

          if (fetchError) throw fetchError;

          const updatedFields = {
            ...(config.fields as Record<string, any> || {}),
            [fieldKey]: event.css
          };

          const { error: configUpdateError } = await supabase
            .from('automation_configs')
            .update({ fields: updatedFields })
            .eq('id', configId);

          if (configUpdateError) throw configUpdateError;
        }
      }

      await fetchCaptureEvents();
      toast({
        title: "Success",
        description: `Element mapped to ${fieldKey} field`
      });
    } catch (error) {
      console.error('Error mapping element:', error);
      toast({
        title: "Error",
        description: "Failed to map element to field",
        variant: "destructive"
      });
    }
  };

  const clearCaptureEvents = async () => {
    try {
      const { error } = await supabase
        .from('automation_capture_events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible ID

      if (error) throw error;

      setCaptureEvents([]);
      toast({
        title: "Success",
        description: "All captured elements cleared"
      });
    } catch (error) {
      console.error('Error clearing capture events:', error);
      toast({
        title: "Error",
        description: "Failed to clear captured elements",
        variant: "destructive"
      });
    }
  };

  const subscribeToRealTimeUpdates = () => {
    const channel = supabase
      .channel('automation_capture_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'automation_capture_events'
        },
        (payload) => {
          console.log('New capture event:', payload.new);
          setCaptureEvents(prev => [payload.new as CaptureEvent, ...prev.slice(0, 99)]);
          toast({
            title: "Element Captured!",
            description: `New ${payload.new.tag} element captured from extension`
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    fetchCaptureEvents();
    const unsubscribe = subscribeToRealTimeUpdates();
    
    return unsubscribe;
  }, []);

  return {
    captureEvents,
    isLoading,
    fetchCaptureEvents,
    mapElementToField,
    clearCaptureEvents,
  };
};