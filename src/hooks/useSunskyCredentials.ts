import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SunskyCredentials {
  id: string;
  name: string;
  username: string;
  country: string;
  is_active: boolean;
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
      // For now, return mock data since we don't have the actual table
      // In a real implementation, this would fetch from supabase
      const mockCredentials: SunskyCredentials[] = [
        {
          id: '1',
          name: 'UAE Sunsky Account',
          username: 'uae_account',
          country: 'UAE',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2', 
          name: 'KSA Sunsky Account',
          username: 'ksa_account',
          country: 'KSA',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      
      setCredentials(mockCredentials);
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

  useEffect(() => {
    fetchCredentials();
  }, []);

  return {
    credentials,
    loading,
    refreshCredentials: fetchCredentials,
  };
}