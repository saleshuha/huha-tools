import React, { useState } from 'react';
import { Package, Upload, ShoppingCart, BarChart3, Store } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { HuhaTab01 } from '@/components/ui/huha-tab-01';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useNoonStores } from '@/hooks/useNoonStores';
import { NoonUploadTab } from '@/components/noon-processing/NoonUploadTab';
import { NoonOrdersTab } from '@/components/noon-processing/NoonOrdersTab';
import { NoonAnalyticsTab } from '@/components/noon-processing/NoonAnalyticsTab';
import { NoonStoresTab } from '@/components/noon-processing/NoonStoresTab';

export default function NoonOrderProcessingPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const { stores } = useNoonStores();

  usePageTracking({
    category: 'Noon',
    subcategory: 'Order Processing',
    pageTitle: 'Noon Order Processing'
  });

  const tabItems = [
    {
      value: 'upload',
      label: '📤 Upload',
      content: <NoonUploadTab stores={stores} selectedStoreId={selectedStoreId} onStoreChange={setSelectedStoreId} />,
    },
    {
      value: 'orders',
      label: '📦 Orders',
      content: <NoonOrdersTab stores={stores} selectedStoreId={selectedStoreId} onStoreChange={setSelectedStoreId} />,
    },
    {
      value: 'analytics',
      label: '📊 Analytics',
      content: <NoonAnalyticsTab stores={stores} />,
    },
    {
      value: 'stores',
      label: '🏪 Stores',
      content: <NoonStoresTab stores={stores} selectedStoreId={selectedStoreId} onStoreChange={setSelectedStoreId} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(var(--primary-light)/0.06),transparent_40%)]" />
      </div>

      <div className="relative z-10 app-container py-8 space-y-6 animate-fade-in">
        <HuhaHeader01
          icon={<Package className="w-5 h-5 text-primary-foreground" />}
          title="Noon Order Processing"
          subtitle="Upload, manage, and analyze Noon marketplace orders"
        />

        <HuhaTab01
          items={tabItems}
          value={activeTab}
          onValueChange={setActiveTab}
          category="Noon"
          subcategory="Order Processing"
          enableTracking={true}
        />
      </div>
    </div>
  );
}
