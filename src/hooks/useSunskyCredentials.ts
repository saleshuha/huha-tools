import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SunskyCredentials {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  last_tested: string;
  created_at: string;
  updated_at: string;
  key_last4?: string;
}

export function useSunskyCredentials() {
  const [credentials, setCredentials] = useState<SunskyCredentials[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: credentials, error } = await supabase
        .from('sunsky_credentials')
        .select('id, user_id, name, key_last4, is_active, last_tested, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Sunsky credentials:', error);
        throw error;
      }

      setCredentials((credentials || []) as SunskyCredentials[]);
    } catch (error) {
      console.error('Error fetching Sunsky credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Sunsky credentials',
        variant: 'destructive',
      });
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('sunsky-credentials-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sunsky_credentials' }, () => {
        fetchCredentials();
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, []);

  return {
    credentials,
    loading,
    refreshCredentials: fetchCredentials,
  };
}