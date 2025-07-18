import { SalesTracking } from '@/components/SalesTracking';

export default function SalesTrackingPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Sales & Ranking Tracker
          </h1>
          <p className="text-muted-foreground text-lg">
            Analyze product sales performance and ranking data with powerful insights
          </p>
        </div>
        <SalesTracking />
      </div>
    </div>
  );
}