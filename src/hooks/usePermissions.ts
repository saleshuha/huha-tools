import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppPermission {
  id: string;
  key: string;
  label: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const [permsResult, rolePermsResult] = await Promise.all([
        supabase
          .from('app_permissions')
          .select('*')
          .order('key'),
        supabase
          .from('role_permissions')
          .select('*')
      ]);

      if (permsResult.error) throw permsResult.error;
      if (rolePermsResult.error) throw rolePermsResult.error;

      setPermissions(permsResult.data || []);
      setRolePermissions(rolePermsResult.data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPermission = async (key: string, label: string, description?: string) => {
    try {
      const { data, error } = await supabase
        .from('app_permissions')
        .insert([{ key, label, description }])
        .select()
        .single();

      if (error) throw error;
      await fetchPermissions();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const setRolePermissions = async (roleId: string, permissionIds: string[]) => {
    try {
      // First delete existing permissions for this role
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Then insert new permissions
      if (permissionIds.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(
            permissionIds.map(permissionId => ({
              role_id: roleId,
              permission_id: permissionId
            }))
          );

        if (error) throw error;
      }

      await fetchPermissions();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const getRolePermissions = (roleId: string): string[] => {
    return rolePermissions
      .filter(rp => rp.role_id === roleId)
      .map(rp => rp.permission_id);
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return {
    permissions,
    rolePermissions,
    loading,
    createPermission,
    setRolePermissions,
    getRolePermissions,
    refetch: fetchPermissions
  };
}