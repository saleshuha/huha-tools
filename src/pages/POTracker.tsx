import { POTracker } from '@/components/POTracker';

export default function POTrackerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] [mask-image:radial-gradient(white,transparent_70%)]" />
        <div className="container relative mx-auto px-6 py-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm">
              <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
              Purchase Order Management
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent sm:text-5xl">
              PO - SS Stock Tracker
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Track purchase orders and manage SKU inventory for Sunsky supplier with advanced analytics and automated matching
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8">
        <POTracker />
      </div>
    </div>
  );
}