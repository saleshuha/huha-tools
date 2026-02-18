import { AsinCostHistory } from '@/components/po/AsinCostHistory';
import { DollarSign } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function AsinCostHistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <div className="mb-8">
          <HuhaHeader01
            icon={<DollarSign className="w-5 h-5 text-primary-foreground" />}
            title="ASIN Cost History"
            subtitle="Track unit cost trends across purchase sessions and suppliers"
            badges={[
              {
                label: "Cost Tracking",
                variant: "secondary" as const,
                className: "bg-green-500/20 text-green-700 dark:text-green-300"
              }
            ]}
          />
        </div>
        <AsinCostHistory />
      </div>
    </div>
  );
}
