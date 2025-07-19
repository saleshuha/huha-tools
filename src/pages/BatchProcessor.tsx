import { BatchProcessor } from '@/components/BatchProcessor';

export default function BatchProcessorPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            ⚡ Batch Processor
          </h1>
          <p className="text-muted-foreground text-lg">
            Process multiple source files with one target template for maximum efficiency
          </p>
        </div>
        <BatchProcessor />
      </div>
    </div>
  );
}