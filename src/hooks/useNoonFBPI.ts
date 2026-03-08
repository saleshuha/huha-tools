import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FBPIOrder {
  id: string;
  user_id: string;
  store_id: string | null;
  fbpi_order_nr: string;
  mp_order_nr: string | null;
  mp_code: string | null;
  mp_country_code: string | null;
  warehouse_code: string | null;
  currency_code: string | null;
  items: any[];
  inventory_status: Record<string, any>;
  status: string;
  order_created_at: string | null;
  fetched_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoonStoreConfig {
  id: string;
  name: string;
  partner_id: string;
  country: string;
  is_active: boolean;
  api_private_key: string | null;
  api_key_id: string | null;
  api_project_code: string | null;
  warehouse_code: string | null;
}

export interface WebhookKey {
  id: string;
  user_id: string;
  api_key: string;
  store_id: string | null;
  is_active: boolean;
  created_at: string;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'vfqqlifvhooefxvvyebm';

async function callEdgeFunction(action: string, payload: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const response = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/noon-fbpi`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Edge function error');
  return data;
}

export function useNoonFBPI() {
  const [stores, setStores] = useState<NoonStoreConfig[]>([]);
  const [orders, setOrders] = useState<FBPIOrder[]>([]);
  const [webhookKeys, setWebhookKeys] = useState<WebhookKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(true);
  const { toast } = useToast();

  const fetchStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const { data, error } = await supabase
        .from('noon_stores_config')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStores((data || []) as any);
    } catch (e) {
      console.error('Error fetching stores:', e);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('noon_fbpi_orders')
        .select('*')
        .order('fetched_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []) as any);
    } catch (e) {
      console.error('Error fetching FBPI orders:', e);
    }
  }, []);

  const fetchWebhookKeys = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('noon_webhook_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWebhookKeys((data || []) as any);
    } catch (e) {
      console.error('Error fetching webhook keys:', e);
    }
  }, []);

  const generateWebhookKey = async (storeId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase
        .from('noon_webhook_keys')
        .insert({ user_id: user.id, store_id: storeId || null } as any) as any);
      if (error) throw error;

      toast({ title: 'Success', description: 'Webhook API key generated' });
      await fetchWebhookKeys();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const revokeWebhookKey = async (keyId: string) => {
    try {
      const { error } = await (supabase
        .from('noon_webhook_keys')
        .update({ is_active: false } as any)
        .eq('id', keyId) as any);
      if (error) throw error;

      toast({ title: 'Success', description: 'Webhook API key revoked' });
      await fetchWebhookKeys();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteWebhookKey = async (keyId: string) => {
    try {
      const { error } = await (supabase
        .from('noon_webhook_keys')
        .delete()
        .eq('id', keyId) as any);
      if (error) throw error;

      toast({ title: 'Success', description: 'Webhook API key deleted' });
      await fetchWebhookKeys();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const testConnection = async (storeId: string) => {
    setLoading(true);
    try {
      const result = await callEdgeFunction('test-connection', { store_id: storeId });
      toast({ title: 'Success', description: result.message || 'Connected successfully' });
      return true;
    } catch (e: any) {
      toast({ title: 'Connection Failed', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchOrder = async (storeId: string, fbpiOrderNr: string) => {
    setLoading(true);
    try {
      const result = await callEdgeFunction('get-order', {
        store_id: storeId,
        fbpi_order_nr: fbpiOrderNr,
      });
      toast({ title: 'Order Fetched', description: `Order ${fbpiOrderNr} retrieved successfully` });
      await fetchOrders();
      return result;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (storeId: string, updatePayload: any) => {
    setLoading(true);
    try {
      const result = await callEdgeFunction('update-order', {
        store_id: storeId,
        update_payload: updatePayload,
      });
      toast({ title: 'Order Updated', description: 'Order updated on Noon successfully' });
      return result;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async (apiKey: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://${PROJECT_ID}.supabase.co/functions/v1/noon-fbpi-webhook?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fbpi_order_nr: `TEST-${Date.now()}`,
          mp_order_nr: 'MP-TEST-001',
          mp_country_code: 'AE',
          warehouse_code: 'WH-TEST',
          currency_code: 'AED',
          items: [
            { partner_sku: 'TEST-SKU-001', quantity: 1, title: 'Test Item' }
          ]
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Webhook test failed');
      toast({ title: 'Webhook Test Passed', description: 'Test order received successfully. Check the Orders tab.' });
      await fetchOrders();
      return true;
    } catch (e: any) {
      toast({ title: 'Webhook Test Failed', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateStoreCredentials = async (
    storeId: string,
    credentials: { api_private_key?: string; api_key_id?: string; api_project_code?: string; warehouse_code?: string }
  ) => {
    try {
      const { error } = await (supabase
        .from('noon_stores_config')
        .update(credentials as any)
        .eq('id', storeId) as any);
      if (error) throw error;
      toast({ title: 'Success', description: 'Store credentials updated' });
      await fetchStores();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    fetchStores();
    fetchOrders();
    fetchWebhookKeys();
  }, [fetchStores, fetchOrders, fetchWebhookKeys]);

  return {
    stores,
    orders,
    webhookKeys,
    loading,
    storesLoading,
    testConnection,
    fetchOrder,
    updateOrder,
    updateStoreCredentials,
    generateWebhookKey,
    revokeWebhookKey,
    deleteWebhookKey,
    refreshOrders: fetchOrders,
    refreshStores: fetchStores,
    refreshWebhookKeys: fetchWebhookKeys,
  };
}
