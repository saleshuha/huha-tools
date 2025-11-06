import { Inventory } from '@/components/Inventory';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function InventoryPage() {
  usePageTracking({
    category: 'Inventory',
    subcategory: 'Stock Management',
    pageTitle: 'Inventory Management'
  });

  return <div className="min-h-screen bg-gradient-surface">
      <div className="w-full px-4 md:px-6 py-4 animate-fade-in">
        <Inventory />
      </div>
    </div>;
}