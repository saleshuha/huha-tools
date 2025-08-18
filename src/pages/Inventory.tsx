import { Inventory } from '@/components/Inventory';
import { VendorIntegrationManager } from '@/components/VendorIntegrationManager';

export default function InventoryPage() {
  return <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in space-y-8">
        <Inventory />
        <VendorIntegrationManager />
      </div>
    </div>;
}