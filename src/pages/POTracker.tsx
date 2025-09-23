import { POTrackerEnhanced } from '@/components/POTrackerEnhanced';
import { ShoppingCart } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function POTrackerPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<ShoppingCart className="w-5 h-5 text-primary-foreground" />}
          title="Amazon Retail"
          subtitle="Track purchase orders and manage SKU inventory for Amazon supplier with advanced analytics and automated matching"
          badges={[
            {
              label: "Purchase Order Management",
              variant: "secondary" as const,
              className: "bg-green-500/20 text-green-700 dark:text-green-300"
            }
          ]}
          className="mb-8"
        />
        <div className="container mx-auto">
          <POTrackerEnhanced />
        </div>
      </div>
    </div>
  );
}