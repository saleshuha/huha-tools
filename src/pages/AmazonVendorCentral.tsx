import { VendorIntegrationManager } from '@/components/VendorIntegrationManager';
import { Store } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function AmazonVendorCentral() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Store className="w-5 h-5 text-primary-foreground" />}
        title="Amazon Vendor Central"
        subtitle="Manage vendor integrations and data exchange with Amazon"
      />
      <div className="glass-container p-8">
        <VendorIntegrationManager />
      </div>
    </PageLayout>
  );
}