import React, { Suspense, lazy } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { InventoryMetricsCards } from '@/components/dashboard/InventoryMetricsCards';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking } from '@/hooks/usePageTracking';

// Lazy load secondary metrics
const VelocityMetricsCards = lazy(() => import('@/components/dashboard/VelocityMetricsCards').then(m => ({ default: m.VelocityMetricsCards })));
const POMetricsCards = lazy(() => import('@/components/dashboard/POMetricsCards').then(m => ({ default: m.POMetricsCards })));
const FulfillmentMetricsCards = lazy(() => import('@/components/dashboard/FulfillmentMetricsCards').then(m => ({ default: m.FulfillmentMetricsCards })));

export default function Homepage() {
  usePageTracking({
    category: 'Admin',
    subcategory: 'Dashboard',
    pageTitle: 'Dashboard Homepage'
  });

  const {
    inventoryMetrics,
    velocityMetrics,
    poMetrics,
    fulfillmentMetrics,
    isLoadingInventory,
    isLoadingSecondary,
    refreshAll
  } = useDashboardMetrics();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        onRefresh={refreshAll}
        isRefreshing={isLoadingInventory}
      />

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Inventory Overview - Loads First */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Inventory</h2>
          <InventoryMetricsCards 
            metrics={inventoryMetrics}
            loading={isLoadingInventory}
          />
        </section>

        {/* Secondary Metrics - Lazy Loaded */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <section>
              <h2 className="text-xl font-semibold mb-3">Sales & Velocity</h2>
              <VelocityMetricsCards 
                metrics={velocityMetrics}
                loading={isLoadingSecondary}
              />
            </section>
          </Suspense>

          <Suspense fallback={<Skeleton className="h-96" />}>
            <section>
              <h2 className="text-xl font-semibold mb-3">Purchase Orders</h2>
              <POMetricsCards 
                metrics={poMetrics}
                loading={isLoadingSecondary}
              />
            </section>
          </Suspense>

          <Suspense fallback={<Skeleton className="h-96" />}>
            <section>
              <h2 className="text-xl font-semibold mb-3">Payments</h2>
              <FulfillmentMetricsCards 
                metrics={fulfillmentMetrics}
                loading={isLoadingSecondary}
              />
            </section>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
