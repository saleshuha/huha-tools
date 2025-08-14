import { POTracker } from '@/components/POTracker';

export default function POTrackerPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
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
  );
}