import { Replenishment } from '@/components/Replenishment';

export default function ReplenishmentPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            📈 AI Replenishment Analytics
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered inventory forecasting and optimal restock recommendations
          </p>
        </div>
        <Replenishment />
      </div>
    </div>
  );
}