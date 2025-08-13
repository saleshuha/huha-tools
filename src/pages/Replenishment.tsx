import { Replenishment } from '@/components/Replenishment';

export default function ReplenishmentPage() {
  return (
    <div className="app-page">
      <div className="app-container">
        <div className="page-header">
          <h1 className="page-title">
            📊 Sales & Replenishment Analytics
          </h1>
          <p className="page-subtitle">
            Real-time sales tracking, inventory analytics, and intelligent replenishment management
          </p>
        </div>
        <div className="glass-container p-8">
          <Replenishment />
        </div>
      </div>
    </div>
  );
}