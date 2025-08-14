import { POTracker } from '@/components/POTracker';

export default function POTrackerPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="glass-container p-8 mb-8 bg-gradient-to-br from-card/95 to-primary/5 hover:from-card/98 hover:to-primary/8 transition-all duration-500">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald flex items-center justify-center shadow-glow">
            <span className="text-2xl">📦</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-emerald to-sky bg-clip-text text-transparent mb-2">
              PO - SS Stock Tracker
            </h1>
            <p className="text-muted-foreground text-lg">
              Track purchase orders and manage SKU inventory for Sunsky supplier
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-emerald"></div>
            <span className="text-sm text-muted-foreground">Advanced Analytics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-sky to-cyan"></div>
            <span className="text-sm text-muted-foreground">Real-time Tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange to-warning"></div>
            <span className="text-sm text-muted-foreground">Inventory Management</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple to-destructive"></div>
            <span className="text-sm text-muted-foreground">Profit Analytics</span>
          </div>
        </div>
      </div>
      <POTracker />
    </div>
  );
}