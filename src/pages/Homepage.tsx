import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { InventoryMetricsCards } from '@/components/dashboard/InventoryMetricsCards';
import { VelocityMetricsCards } from '@/components/dashboard/VelocityMetricsCards';
import { POMetricsCards } from '@/components/dashboard/POMetricsCards';
import { FulfillmentMetricsCards } from '@/components/dashboard/FulfillmentMetricsCards';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

export default function Homepage() {
  const {
    inventoryMetrics,
    velocityMetrics,
    poMetrics,
    fulfillmentMetrics,
    isLoading,
    lastUpdated,
    refreshAll
  } = useDashboardMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-gradient-to-br from-indigo-400/5 to-purple-400/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10">
        {/* Dashboard Header */}
        <DashboardHeader 
          onRefresh={refreshAll}
          isRefreshing={isLoading}
          lastUpdated={lastUpdated}
        />

        {/* Main Dashboard Content */}
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Section 1: Inventory Overview */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              📦 Instock Inventory Overview
            </h2>
            <InventoryMetricsCards 
              metrics={inventoryMetrics}
              loading={isLoading}
            />
          </section>

          {/* Section 2: Sales & Replenishment + PO Tracker + Fulfillment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Velocity Analytics - Right Column */}
            <section className="lg:col-span-1">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                ⚡ Sales & Replenishment
              </h2>
              <VelocityMetricsCards 
                metrics={velocityMetrics}
                loading={isLoading}
              />
            </section>

            {/* PO Tracker - Middle */}
            <section className="lg:col-span-1">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                📋 Purchase Orders
              </h2>
              <POMetricsCards 
                metrics={poMetrics}
                loading={isLoading}
              />
            </section>

            {/* Fulfillment & Payments - Right */}
            <section className="lg:col-span-1">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                💰 Fulfillment & Payments
              </h2>
              <FulfillmentMetricsCards 
                metrics={fulfillmentMetrics}
                loading={isLoading}
              />
            </section>
          </div>

          {/* Quick Actions Panel */}
          <section>
            <QuickActionsPanel />
          </section>
        </div>
      </div>
    </div>
  );
}
