import { Replenishment } from '@/components/Replenishment';
import { BarChart3 } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function ReplenishmentPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />}
          title="Sales & Replenishment Analytics"
          subtitle="Real-time sales tracking, inventory analytics, and intelligent replenishment management"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <Replenishment />
        </div>
      </div>
    </div>
  );
}