import { AsinQtySum } from '@/components/AsinQtySum';
import { Calculator } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function AsinQtySumPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Calculator className="w-5 h-5 text-primary-foreground" />}
          title="ASIN Quantity Sum"
          subtitle="Efficiently sum quantities by unique ASIN for streamlined inventory management"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <AsinQtySum />
        </div>
      </div>
    </div>
  );
}