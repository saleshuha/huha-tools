import { POTracker } from '@/components/POTracker';

export default function POTrackerPage() {
  return (
    <div className="app-page">
      <div className="app-container">
        <div className="page-header">
          <h1 className="page-title">
            📋 PO - SS Stock Tracker
          </h1>
          <p className="page-subtitle">
            Track purchase orders and manage SKU inventory for Sunsky supplier
          </p>
        </div>
        <div className="glass-container p-8">
          <POTracker />
        </div>
      </div>
    </div>
  );
}