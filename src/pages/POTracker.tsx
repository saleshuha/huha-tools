import { POTracker } from '@/components/POTracker';
import { PODashboardOverview } from '@/components/po/PODashboardOverview';
import { POUploadWizard } from '@/components/po/POUploadWizard';
import { POTrackerEnhanced } from '@/components/po/enhanced/POTrackerEnhanced';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from 'react';

export default function POTrackerPage() {
  const [activeView, setActiveView] = useState<'enhanced' | 'legacy'>('enhanced');
  
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
      
      {/* Enhanced tracker by default */}
      <POTrackerEnhanced />
    </div>
  );
}