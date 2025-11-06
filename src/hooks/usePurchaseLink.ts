import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PurchaseLinkData, GenerateLinkRequest } from '@/types/purchase-link';

const FUNCTION_URL = `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/purchase-link-handler`;

export const usePurchaseLink = (token?: string) => {
  const [data, setData] = useState<PurchaseLinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchLinkData(token);
    }
  }, [token]);

  const fetchLinkData = async (linkToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${FUNCTION_URL}/data/${linkToken}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch link data');
      }
      
      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching purchase link data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async (request: GenerateLinkRequest): Promise<{ link_token: string } | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${FUNCTION_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate link');
      }
      
      return result.data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error generating purchase link:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const savePurchaseUpdate = async (linkToken: string, updateData: any) => {
    try {
      const response = await fetch(`${FUNCTION_URL}/update/${linkToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save update');
      }
      
      return result.data;
    } catch (err: any) {
      console.error('Error saving purchase update:', err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    generateLink,
    savePurchaseUpdate,
    refetch: token ? () => fetchLinkData(token) : undefined
  };
};

export const useUserPurchaseLinks = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_links')
        .select('*, purchase_updates(count)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLinks(data || []);
    } catch (err) {
      console.error('Error fetching user links:', err);
    } finally {
      setLoading(false);
    }
  };

  const deactivateLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_links')
        .update({ is_active: false })
        .eq('id', linkId);
      
      if (error) throw error;
      await fetchUserLinks();
    } catch (err) {
      console.error('Error deactivating link:', err);
      throw err;
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
      await fetchUserLinks();
    } catch (err) {
      console.error('Error deleting link:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchUserLinks();
  }, []);

  return {
    links,
    loading,
    fetchUserLinks,
    deactivateLink,
    deleteLink
  };
};
