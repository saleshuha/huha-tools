import { Inventory } from '@/components/Inventory';

export default function InventoryPage() {
  return <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-2 sm:px-4 md:px-6 py-2 sm:py-4 animate-fade-in">
        <Inventory />
      </div>
    </div>;
}