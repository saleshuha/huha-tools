import { VendorIntegrationManager } from '@/components/VendorIntegrationManager';
import { Store } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function AmazonVendorCentral() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Store className="w-5 h-5 text-primary-foreground" />}
          title="Amazon Vendor Central"
          subtitle="Manage vendor integrations and data exchange with Amazon"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <VendorIntegrationManager />
        </div>
      </div>
    </div>
  );
}