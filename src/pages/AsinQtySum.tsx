import { AsinQtySum } from '@/components/AsinQtySum';
import { Calculator } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function AsinQtySumPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Calculator className="w-5 h-5 text-primary-foreground" />}
        title="ASIN Quantity Sum"
        subtitle="Efficiently sum quantities by unique ASIN for streamlined inventory management"
      />
      <div className="glass-container p-8">
        <AsinQtySum />
      </div>
    </PageLayout>
  );
}