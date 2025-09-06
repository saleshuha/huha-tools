import React from 'react';
import { NoonOrdersUploader } from '@/components/NoonOrdersUploader';
import { Package } from 'lucide-react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';

export default function NoonOrderProcessingPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <HuhaHeader01
          icon={<Package className="w-5 h-5 text-primary-foreground" />}
          title="Noon Order Processing"
          subtitle="Upload and process Noon marketplace orders efficiently"
          className="mb-8"
        />
        <div className="glass-container mx-6 p-8">
          <NoonOrdersUploader />
        </div>
      </div>
    </div>
  );
}