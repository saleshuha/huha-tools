import { POTracker } from '@/components/POTracker';
import { PODashboardOverview } from '@/components/po/PODashboardOverview';
import { POUploadWizard } from '@/components/po/POUploadWizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from 'react';

export default function POTrackerPage() {
  const [activeView, setActiveView] = useState<'dashboard' | 'upload' | 'tracker'>('dashboard');
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          PO - SS Stock Tracker
        </h1>
        <p className="text-muted-foreground text-lg">
          Modern PO management with enhanced tracking and analytics
        </p>
      </div>
      
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="upload">Upload PO</TabsTrigger>
          <TabsTrigger value="tracker">Order Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <PODashboardOverview onViewDetails={(type) => setActiveView('tracker')} />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <POUploadWizard onUploadComplete={() => setActiveView('dashboard')} />
        </TabsContent>

        <TabsContent value="tracker" className="mt-6">
          <POTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}