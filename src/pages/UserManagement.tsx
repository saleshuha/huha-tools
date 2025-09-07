import { UserManagement } from '@/components/UserManagement';
import { Users } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function UserManagementPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Users className="w-5 h-5 text-primary-foreground" />}
        title="User Management"
        subtitle="Manage user accounts and permissions"
      />
      <div className="glass-container p-8">
        <UserManagement />
      </div>
    </PageLayout>
  );
}