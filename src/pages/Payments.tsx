import { PaymentsManager } from '@/components/PaymentsManager';

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            💳 Payment Tracking
          </h1>
          <p className="text-muted-foreground text-lg">
            Monitor and track payments from various e-commerce platforms
          </p>
        </div>
        <PaymentsManager />
      </div>
    </div>
  );
}