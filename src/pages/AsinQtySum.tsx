import { AsinQtySum } from '@/components/AsinQtySum';

export default function AsinQtySumPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            ASIN Quantity Sum
          </h1>
          <p className="text-muted-foreground text-lg">
            Efficiently sum quantities by unique ASIN for streamlined inventory management
          </p>
        </div>
        <AsinQtySum />
      </div>
    </div>
  );
}