import React from 'react';
import { NoonOrdersUploader } from '@/components/NoonOrdersUploader';
import { Package } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { PageLayout } from '@/components/layout/PageLayout';

export default function NoonOrderProcessingPage() {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<Package className="w-5 h-5 text-primary-foreground" />}
        title="Noon Order Processing"
        subtitle="Upload and process Noon marketplace orders efficiently"
      />
      <div className="glass-container p-8">
        <NoonOrdersUploader />
      </div>
    </PageLayout>
  );
}