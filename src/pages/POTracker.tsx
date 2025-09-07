import { POTracker } from '@/components/POTracker';
import { ShoppingCart } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function POTrackerPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<ShoppingCart className="w-5 h-5 text-primary-foreground" />}
        title="PO - SS Stock Tracker"
        subtitle="Track purchase orders and manage SKU inventory for Sunsky supplier with advanced analytics and automated matching"
        badges={[
          {
            label: "Purchase Order Management",
            variant: "secondary" as const,
            className: "bg-green-500/20 text-green-700 dark:text-green-300"
          }
        ]}
      />
      <div className="glass-container p-8">
        <POTracker />
      </div>
    </PageLayout>
  );
}