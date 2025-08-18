import { VendorIntegrationManager } from '@/components/VendorIntegrationManager';

export default function AmazonVendorCentral() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <VendorIntegrationManager />
      </div>
    </div>
  );
}