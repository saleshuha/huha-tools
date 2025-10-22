import { Building2 } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { SupplierStats } from '@/components/supplier/SupplierStats';
import { SupplierManagement } from '@/components/supplier/SupplierManagement';
import { useSuppliers } from '@/hooks/useSuppliers';

const GlobalSources = () => {
  const { suppliers } = useSuppliers();

  return (
    <div className="min-h-screen bg-background">
      <HuhaHeader01
        icon={<Building2 className="h-6 w-6 text-primary-foreground" />}
        title="Global Sources"
        subtitle="Manage your supplier network and contacts"
      />

      <div className="container mx-auto p-6 space-y-6">
        <SupplierStats suppliers={suppliers} />
        <SupplierManagement />
      </div>
    </div>
  );
};

export default GlobalSources;
