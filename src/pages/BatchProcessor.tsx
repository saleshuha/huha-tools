import { BatchProcessor } from '@/components/BatchProcessor';
import { Zap } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function BatchProcessorPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Zap className="w-5 h-5 text-primary-foreground" />}
          title="Batch Processor"
          subtitle="Process multiple source files with one target template for maximum efficiency"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <BatchProcessor />
        </div>
      </div>
    </div>
  );
}