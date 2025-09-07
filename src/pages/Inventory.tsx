import { Inventory } from '@/components/Inventory';
import { PageLayout } from '@/components/layout/PageLayout';

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <PageLayout>
        <Inventory />
      </PageLayout>
    </div>
  );
}