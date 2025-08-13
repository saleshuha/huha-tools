import { BatchProcessor } from '@/components/BatchProcessor';

export default function BatchProcessorPage() {
  return (
    <div className="app-page">
      <div className="app-container">
        <div className="page-header">
          <h1 className="page-title">
            ⚡ Batch Processor
          </h1>
          <p className="page-subtitle">
            Process multiple source files with one target template for maximum efficiency
          </p>
        </div>
        <div className="glass-container p-8">
          <BatchProcessor />
        </div>
      </div>
    </div>
  );
}