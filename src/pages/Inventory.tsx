import { Inventory } from '@/components/Inventory';
export default function InventoryPage() {
  return (
    <div className="app-page">
      <div className="app-container">
        <div className="page-header">
          <h1 className="page-title">
            📦 Inventory Management
          </h1>
          <p className="page-subtitle">
            Comprehensive inventory tracking and management system
          </p>
        </div>
        <div className="glass-container p-8">
          <Inventory />
        </div>
      </div>
    </div>
  );
}