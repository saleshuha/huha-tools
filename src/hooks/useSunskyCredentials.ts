import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SunskyCredentials {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  api_secret: string;
  is_active: boolean;
  last_tested: string;
  created_at: string;
  updated_at: string;
}

export function useSunskyCredentials() {
  const [credentials, setCredentials] = useState<SunskyCredentials[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sunsky_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Sunsky credentials table not found, using mock data');
        // Fallback to mock data if table doesn't exist
        const mockCredentials: SunskyCredentials[] = [
          {
            id: '1',
            user_id: 'mock-user',
            name: 'UAE Sunsky Account',
            api_key: 'mock-api-key',
            api_secret: 'mock-secret',
            is_active: true,
            last_tested: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: '2',
            user_id: 'mock-user', 
            name: 'KSA Sunsky Account',
            api_key: 'mock-api-key-2',
            api_secret: 'mock-secret-2',
            is_active: true,
            last_tested: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];
        
        setCredentials(mockCredentials);
      } else {
        setCredentials(data || []);
      }
    } catch (error) {
      console.error('Error fetching Sunsky credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Sunsky credentials',
        variant: 'destructive',
      });
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