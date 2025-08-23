import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserProfile } from '@/hooks/useUserProfile';

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
  const { user } = useUserProfile();
  const { hasPermission, loading } = useUserPermissions(user?.id);

  if (loading) {
    return null;
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}