import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export function useRoles() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('app_roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRole = async (name: string, description?: string) => {
    try {
      const { data, error } = await supabase
        .from('app_roles')
        .insert([{ name, description }])
        .select()
        .single();

      if (error) throw error;
      await fetchRoles();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('app_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      await fetchRoles();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return {
    roles,
    loading,
    createRole,
    deleteRole,
    refetch: fetchRoles
  };
}