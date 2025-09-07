import { BatchProcessor } from '@/components/BatchProcessor';
import { Zap } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function BatchProcessorPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Zap className="w-5 h-5 text-primary-foreground" />}
        title="Batch Processor"
        subtitle="Process multiple source files with one target template for maximum efficiency"
      />
      <div className="glass-container p-8">
        <BatchProcessor />
      </div>
    </PageLayout>
  );
}