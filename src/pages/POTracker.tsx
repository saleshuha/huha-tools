import { POTracker } from '@/components/POTracker';

export default function POTrackerPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            PO - SS Stock Tracker
          </h1>
          <p className="text-muted-foreground text-lg">
            Track purchase orders and manage SKU inventory for Sunsky supplier
          </p>
        </div>
        <POTracker />
      </div>
    </div>
  );
}