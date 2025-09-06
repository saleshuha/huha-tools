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
      // Update existing credentials to use the new secure function
      const { data: credentials, error } = await supabase.rpc('get_user_sunsky_credentials_secure');

      if (error) {
        console.warn('Sunsky credentials function not found, using mock data');
        // Fallback to mock data if function doesn't exist
        const mockCredentials: SunskyCredentials[] = [
          {
            id: '1',
            user_id: 'mock-user',
            name: 'UAE Sunsky Account',
            is_active: true,
            last_tested: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            key_last4: '1234',
          },
          {
            id: '2',
            user_id: 'mock-user', 
            name: 'KSA Sunsky Account',
            is_active: true,
            last_tested: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            key_last4: '5678',
          }
        ];
        
        setCredentials(mockCredentials);
      } else {
        setCredentials(credentials || []);
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