import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PagePermission {
  id: string;
  user_id: string;
  page_route: string;
  created_at: string;
  updated_at: string;
}

export function useUserPagePermissions(userId?: string) {
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPermissions = async () => {
    if (!userId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_page_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setPermissions((data || []) as any);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch page permissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [userId]);

  const updatePermissions = async (pageRoutes: string[]) => {
    if (!userId) return;

    try {
      // Delete existing permissions
      await supabase
        .from('user_page_permissions')
        .delete()
        .eq('user_id', userId);

      // Insert new permissions
      if (pageRoutes.length > 0) {
        const { error } = await supabase
          .from('user_page_permissions')
          .insert(
            pageRoutes.map(route => ({
              user_id: userId,
              page_route: route
            })) as any
          );

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Page permissions updated successfully"
      });

      await fetchPermissions();
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive"
      });
    }
  };

  return {
    permissions,
    loading,
    updatePermissions,
    allowedRoutes: permissions.map(p => p.page_route)
  };
}
