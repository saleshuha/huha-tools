import { UserManagement } from '@/components/UserManagement';
import { Users } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function UserManagementPage() {
  usePageTracking({
    category: 'Admin',
    subcategory: 'Users',
    pageTitle: 'User Management'
  });

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Users className="w-5 h-5 text-primary-foreground" />}
          title="User Management"
          subtitle="Manage user accounts and permissions"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <UserManagement />
        </div>
      </div>
    </div>
  );
}