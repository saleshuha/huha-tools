import { Inventory } from '@/components/Inventory';

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            📦 Inventory Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Track and manage your product inventory with ASIN and serial numbers
          </p>
        </div>
        <Inventory />
      </div>
    </div>
  );
}