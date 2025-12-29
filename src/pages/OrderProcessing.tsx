import { OrderProcessorNew } from '@/components/OrderProcessorNew';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { Package } from 'lucide-react';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function OrderProcessingPage() {
  usePageTracking({
    category: 'Amazon',
    subcategory: 'Order Processing',
    pageTitle: 'DF Order Processing'
  });

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Enhanced Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary-light)/0.06),transparent_40%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-sky-500/5" />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 app-container py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <HuhaHeader01
            icon={<Package className="w-5 h-5 text-primary-foreground" />}
            title="DF Order Processing"
            subtitle="Upload orders, match with inventory, and process stock deductions"
          />
        </div>

        {/* Main Processor Component */}
        <OrderProcessorNew />
      </div>
    </div>
  );
}