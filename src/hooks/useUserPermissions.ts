import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUserPermissions(userId?: string) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAdminRole, setHasAdminRole] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Check if user has admin role (backwards compatibility)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        const isLegacyAdmin = profile?.role === 'admin';
        setHasAdminRole(isLegacyAdmin);

        // If legacy admin, grant all permissions
        if (isLegacyAdmin) {
          const { data: allPerms } = await supabase
            .from('app_permissions')
            .select('key');
          
          setPermissions(allPerms?.map(p => p.key) || []);
          setLoading(false);
          return;
        }

        // Otherwise, get effective permissions from RBAC
        const { data, error } = await supabase
          .rpc('get_effective_permissions', { _user_id: userId });

        if (error) throw error;
        setPermissions(data?.map(p => p.permission_key) || []);
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [userId]);

  const hasPermission = (permission: string): boolean => {
    return hasAdminRole || permissions.includes(permission);
  };

  const hasRole = async (roleName: string): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: userId, _role_name: roleName });
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasRole,
    hasAdminRole
  };
}
