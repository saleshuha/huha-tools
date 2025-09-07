import { Replenishment } from '@/components/Replenishment';
import { BarChart3 } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function ReplenishmentPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />}
        title="Sales & Replenishment Analytics"
        subtitle="Real-time sales tracking, inventory analytics, and intelligent replenishment management"
      />
      <div className="glass-container p-8">
        <Replenishment />
      </div>
    </PageLayout>
  );
}