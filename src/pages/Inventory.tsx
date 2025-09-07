import { Inventory } from '@/components/Inventory';
import { Package } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function InventoryPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Package className="w-5 h-5 text-primary-foreground" />}
        title="Instock Inventory Management"
        subtitle="Advanced Amazon ASIN tracking and analytics"
      />
      <div className="glass-container p-8">
        <Inventory />
      </div>
    </PageLayout>
  );
}