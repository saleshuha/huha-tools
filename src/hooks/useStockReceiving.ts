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
  country?: string;
}

export interface POAllocation {
  po_id: string;
  po_number: string;
  quantity_needed: number;
  quantity_allocated: number;
  status: 'fulfilled' | 'partial';
}

export interface ManualPOAllocation {
  po_number: string;  // Primary identifier - backend will find matching item
  quantity: number;
  priority?: number;
}

export interface ProcessingResult {
  item_id: string;
  matched_pos: POAllocation[];
  quantity_to_inventory: number;
  inventory_id?: string;
  success: boolean;
  message: string;
  error?: string;
  manual_po_allocations?: Array<{po_id: string, po_number: string, quantity: number, priority: number}>;
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
      console.log('[Stock Receiving] Testing connection...');
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Stock Receiving] Auth status:', {
        hasSession: !!session,
        hasToken: !!session?.access_token
      });
      
      if (!session) {
        console.error('[Stock Receiving] No session found');
        return { connected: false, error: 'Not authenticated', details: 'Please log in again' };
      }

      const SUPABASE_URL = 'https://vfqqlifvhooefxvvyebm.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM';
      
      console.log('[Stock Receiving] Making direct fetch request...');
      const fetchResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/smart-stock-receiving`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({ test: true })
        }
      );

      console.log('[Stock Receiving] Fetch response status:', fetchResponse.status);

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('[Stock Receiving] Fetch error:', {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          body: errorText
        });
        
        if (fetchResponse.status === 404) {
          return { 
            connected: false, 
            error: 'Edge function not found',
            details: 'The smart-stock-receiving function may not be deployed'
          };
        }
        
        return { 
          connected: false, 
          error: `HTTP ${fetchResponse.status}`,
          details: errorText || fetchResponse.statusText
        };
      }

      const data = await fetchResponse.json();
      console.log('[Stock Receiving] Response data:', data);

      if (data && data.status === 'ok') {
        console.log('[Stock Receiving] ✅ Connection test successful');
        return { connected: true, error: null };
      }

      return { 
        connected: false, 
        error: 'Unexpected response',
        details: 'Edge function did not return expected test response'
      };
    } catch (error) {
      console.error('[Stock Receiving] Connection test exception:', error);
      return { 
        connected: false, 
        error: 'Connection failed',
        details: error.message
      };
    }
  };

  const processItems = async (
    items: ReceivingItem[],
    autoFulfill = true,
    sessionId?: string,
    country?: string,
    manualPOAllocations?: ManualPOAllocation[]
  ): Promise<ProcessingResult[]> => {
    try {
      setIsProcessing(true);
      
      console.log('[Stock Receiving] Starting processing...', {
        itemCount: items.length,
        autoFulfill,
        sessionId: sessionId || currentSession?.id,
        items: items
      });

      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Stock Receiving] Auth check:', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        userId: session?.user?.id
      });
      
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const SUPABASE_URL = 'https://vfqqlifvhooefxvvyebm.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXFsaWZ2aG9vZWZ4dnZ5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MzY1OTgsImV4cCI6MjA2ODAxMjU5OH0.u-iIilnOACJTo_3AUCkmhREXdVV84JmbswtM_-NJJBM';

      console.log('[Stock Receiving] Making direct fetch request...');
      const requestBody = {
        items,
        auto_fulfill: autoFulfill,
        session_id: sessionId || currentSession?.id,
        country: country,
        manual_po_allocations: manualPOAllocations
      };
      console.log('[Stock Receiving] Request body:', requestBody);

      const fetchResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/smart-stock-receiving`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('[Stock Receiving] Fetch response status:', fetchResponse.status);

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('[Stock Receiving] Fetch error:', {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          body: errorText
        });
        
        if (fetchResponse.status === 404) {
          throw new Error('Edge function not deployed. Please deploy the smart-stock-receiving function.');
        }
        
        if (fetchResponse.status === 401 || fetchResponse.status === 403) {
          throw new Error('Authentication error. Please log out and log back in.');
        }

        throw new Error(`HTTP ${fetchResponse.status}: ${errorText || fetchResponse.statusText}`);
      }

      const responseData = await fetchResponse.json();
      console.log('[Stock Receiving] Response data:', responseData);

      const { results, session_id, summary } = responseData;
      console.log('[Stock Receiving] ✅ Processing successful:', {
        resultsCount: results?.length,
        sessionId: session_id,
        summary
      });

      toast({
        title: 'Processing Complete',
        description: `Processed ${summary.total_items} items: ${summary.items_allocated_to_pos} to POs, ${summary.items_added_to_inventory} to inventory`
      });

      // Reload sessions to get updated data
      await loadSessions();

      return results;
    } catch (error) {
      console.error('[Stock Receiving] ❌ Processing error:', {
        message: error.message,
        error: error
      });
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

  const getSessionInventoryItems = async (sessionId: string) => {
    try {
      // Get receiving items that were added to inventory
      const { data: receivingItems, error: itemsError } = await supabase
        .from('stock_receiving_items')
        .select('*')
        .eq('session_id', sessionId)
        .gt('quantity_added_to_inventory', 0);

      if (itemsError) throw itemsError;
      if (!receivingItems || receivingItems.length === 0) return [];

      // Fetch actual inventory records
      const inventoryPromises = receivingItems.map(item => 
        supabase
          .from('asin_inventory')
          .select('*')
          .eq('serial_number', item.serial_number)
          .single()
      );

      const inventoryResults = await Promise.all(inventoryPromises);
      return inventoryResults
        .filter(r => r.data)
        .map(r => r.data);
    } catch (error) {
      console.error('Error loading session inventory items:', error);
      return [];
    }
  };

  // Process single item immediately
  const processSingleItem = async (
    item: ReceivingItem | ReceivingItem[],
    autoFulfill = true,
    sessionId?: string,
    country?: string,
    manualPOAllocations?: ManualPOAllocation[]
  ) => {
    const items = Array.isArray(item) ? item : [item];
    return processItems(items, autoFulfill, sessionId, country, manualPOAllocations);
  };

  return {
    sessions,
    currentSession,
    isProcessing,
    loading,
    createSession,
    processItems,
    processSingleItem,
    endSession,
    getSessionItems,
    getSessionInventoryItems,
    loadSessions,
    testConnection
  };
}
