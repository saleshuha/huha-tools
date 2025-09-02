import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NoonOrdersUpload } from '@/components/NoonOrdersUpload';
import { NoonOrdersTable } from '@/components/NoonOrdersTable';

export default function NoonOrderTrackingPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="container relative mx-auto px-6 py-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm">
              <span className="mr-2 h-2 w-2 rounded-full bg-blue-500"></span>
              Noon Orders Integration
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent sm:text-5xl">
              Noon Orders Tracking
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Upload and manage your noon orders with automated Sunsky integration for seamless order fulfillment
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="orders">Orders Management</TabsTrigger>
            <TabsTrigger value="upload">Upload Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <NoonOrdersTable 
              selectedStoreId={selectedStoreId}
              onStoreChange={setSelectedStoreId}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <NoonOrdersUpload 
              selectedStoreId={selectedStoreId}
              onUploadComplete={() => setActiveTab('orders')}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}