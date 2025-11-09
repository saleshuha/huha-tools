import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReceivingItem {
  asin?: string;
  sku_code?: string;
  model_number?: string;
  quantity: number;
  serial_number?: string;
  supplier_name?: string;
  notes?: string;
  title?: string;
}

export interface POAllocation {
  po_id: string;
  po_number: string;
  quantity_needed: number;
  quantity_allocated: number;
  status: 'fulfilled' | 'partial';
}

export interface ProcessingResult {
  item_id: string;
  matched_pos: POAllocation[];
  quantity_to_inventory: number;
  inventory_id?: string;
  success: boolean;
  message: string;
  error?: string;
}

export interface ReceivingSession {
  id: string;
  session_date: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  total_items_received: number;
  items_allocated_to_pos: number;
  items_added_to_inventory: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useStockReceiving() {
  const [sessions, setSessions] = useState<ReceivingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ReceivingSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_receiving_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load receiving sessions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('stock_receiving_sessions')
        .insert({
          user_id: user.id,
          notes,
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentSession(data);
      
      toast({
        title: 'Session Created',
        description: 'New receiving session started'
      });

      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive'
      });
      return null;
    }
  };

  const testConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { connected: false, error: 'Not authenticated' };

      const response = await supabase.functions.invoke('smart-stock-receiving', {
        body: { test: true },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        const errorMsg = response.error.message || '';
        
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          return { 
            connected: false, 
            error: 'Edge function not deployed',
            details: 'The smart-stock-receiving function needs to be deployed to Supabase'
          };
        }
        
        if (errorMsg.includes('FunctionsRelayError') || errorMsg.includes('FunctionsHttpError')) {
          return { 
            connected: false, 
            error: 'Cannot reach edge function',
            details: 'Network or configuration issue. Check your connection and Supabase status.'
          };
        }

        return { 
          connected: false, 
          error: 'Function error',
          details: errorMsg
        };
      }

      // Check if the response indicates success
      if (response.data && response.data.status === 'ok') {
        return { connected: true, error: null };
      }

      return { 
        connected: false, 
        error: 'Unexpected response',
        details: 'Edge function did not return expected test response'
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { 
        connected: false, 
        error: 'Connection test failed',
        details: error.message
      };
    }
  };

  const processItems = async (
    items: ReceivingItem[],
    autoFulfill = true,
    sessionId?: string
  ): Promise<ProcessingResult[]> => {
    try {
      setIsProcessing(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('smart-stock-receiving', {
        body: {
          items,
          auto_fulfill: autoFulfill,
          session_id: sessionId || currentSession?.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        const errorMsg = response.error.message || '';
        
        // Provide specific error messages
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          throw new Error('Edge function not deployed. Please deploy the smart-stock-receiving function to Supabase.');
        }
        
        if (errorMsg.includes('FunctionsRelayError') || errorMsg.includes('FunctionsHttpError')) {
          throw new Error('Cannot reach edge function. Please check your network connection and Supabase status.');
        }
        
        if (errorMsg.includes('JWT')) {
          throw new Error('Authentication error. Please log out and log back in.');
        }

        throw new Error(errorMsg || 'Edge function returned an error');
      }

      if (!response.data) {
        throw new Error('No data returned from edge function');
      }

      const { results, session_id, summary } = response.data;

      toast({
        title: 'Processing Complete',
        description: `Processed ${summary.total_items} items: ${summary.items_allocated_to_pos} to POs, ${summary.items_added_to_inventory} to inventory`
      });

      // Reload sessions to get updated data
      await loadSessions();

      return results;
    } catch (error) {
      console.error('Error processing items:', error);
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process items',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('stock_receiving_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (error) throw error;

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }

      await loadSessions();

      toast({
        title: 'Session Ended',
        description: 'Receiving session has been completed'
      });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: 'Error',
        description: 'Failed to end session',
        variant: 'destructive'
      });
    }
  };

  const getSessionItems = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_receiving_items')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading session items:', error);
      return [];
    }
  };

  return {
    sessions,
    currentSession,
    isProcessing,
    loading,
    createSession,
    processItems,
    endSession,
    getSessionItems,
    loadSessions,
    testConnection
  };
}
