import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  role_name?: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  created_at: string;
  permission_key?: string;
}

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = async () => {
    try {
      const [rolesResult, permsResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select(`
            *,
            role:app_roles(name)
          `),
        supabase
          .from('user_permissions')
          .select(`
            *,
            permission:app_permissions(key)
          `)
      ]);

      if (rolesResult.error) throw rolesResult.error;
      if (permsResult.error) throw permsResult.error;

      const formattedRoles = rolesResult.data?.map(ur => ({
        ...ur,
        role_name: (ur as any).role?.name
      })) || [];

      const formattedPerms = permsResult.data?.map(up => ({
        ...up,
        permission_key: (up as any).permission?.key
      })) || [];

      setUserRoles(formattedRoles);
      setUserPermissions(formattedPerms);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignUserRoles = async (userId: string, roleIds: string[]) => {
    try {
      // First delete existing roles for this user
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new roles
      if (roleIds.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .insert(
            roleIds.map(roleId => ({
              user_id: userId,
              role_id: roleId
            }))
          );

        if (error) throw error;
      }

      await fetchUserRoles();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const assignUserPermissions = async (userId: string, permissionIds: string[]) => {
    try {
      // First delete existing direct permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Then insert new permissions
      if (permissionIds.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(
            permissionIds.map(permissionId => ({
              user_id: userId,
              permission_id: permissionId
            }))
          );

        if (error) throw error;
      }

      await fetchUserRoles();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const getUserRoles = (userId: string): string[] => {
    return userRoles
      .filter(ur => ur.user_id === userId)
      .map(ur => ur.role_id);
  };

  const getUserPermissions = (userId: string): string[] => {
    return userPermissions
      .filter(up => up.user_id === userId)
      .map(up => up.permission_id);
  };

  useEffect(() => {
    fetchUserRoles();
  }, []);

  return {
    userRoles,
    userPermissions,
    loading,
    assignUserRoles,
    assignUserPermissions,
    getUserRoles,
    getUserPermissions,
    refetch: fetchUserRoles
  };
}