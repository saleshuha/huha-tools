import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, DollarSign, Settings, BarChart3, ShoppingCart, Trash2, ArrowLeftRight } from 'lucide-react';
import { MetricsDashboard } from '@/components/amazon/MetricsDashboard';
import { OrdersTable } from '@/components/amazon/OrdersTable';
import { ImportOrdersDialog } from '@/components/amazon/ImportOrdersDialog';
import { CurrencyRatesDialog } from '@/components/amazon/CurrencyRatesDialog';
import { ReAuthDialog } from '@/components/amazon/ReAuthDialog';
import { PaymentSettingsDialog } from '@/components/amazon/PaymentSettingsDialog';
import { CurrencyDisplayProvider, CurrencySelector } from '@/components/amazon/CurrencySelector';
import { useAmazonOrders } from '@/hooks/useAmazonOrders';
import { useCountry } from '@/contexts/CountryContext';
import { useUserProfile } from '@/hooks/useUserProfile';

const AmazonFulfillmentTracker = () => {
  const { selectedCountry } = useCountry();
  const { profile, user } = useUserProfile();
  const { orders, loading, metrics, updateOrder, deleteOrder, bulkImportOrders, clearAllOrders } = useAmazonOrders();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showReAuthDialog, setShowReAuthDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  return (
    <CurrencyDisplayProvider>
      <div className="min-h-screen bg-background">
        {/* Compact Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-foreground truncate">Amazon Fulfillment Tracker</h1>
                <p className="text-xs text-muted-foreground truncate">Payment tracking · {selectedCountry}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <CurrencySelector />
              <Button variant="ghost" size="sm" onClick={() => setShowSettingsDialog(true)} className="h-9 px-2.5">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCurrencyDialog(true)} className="h-9 px-2.5">
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <Button variant="default" size="sm" onClick={() => setShowImportDialog(true)} className="h-9 gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              {user && profile?.role === 'admin' && (
                <Button variant="ghost" size="sm" onClick={() => setShowReAuthDialog(true)} className="h-9 px-2.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="h-10 p-1 bg-muted/50 w-auto inline-flex">
              <TabsTrigger
                value="dashboard"
                className="h-8 px-4 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="h-8 px-4 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4 mt-0">
              <MetricsDashboard metrics={metrics} loading={loading} orders={orders} />

              {/* Payment Status Banner */}
              {metrics?.paidThroughDate && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success font-medium text-center">
                    ✓ Paid through: {new Date(metrics.paidThroughDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {metrics && !metrics.paidThroughDate && metrics.totalOrders > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning font-medium text-center">
                    ⚠ No fully paid period — payments pending from earliest orders
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              <OrdersTable
                orders={orders}
                onUpdateOrder={updateOrder}
                onDeleteOrder={deleteOrder}
                onBulkUpdateStatus={async (ids: string[], status: string) => {
                  for (const id of ids) {
                    await updateOrder(id, { payment_status: status, status: status === 'completed' ? 'Paid' : undefined } as any);
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <ImportOrdersDialog open={showImportDialog} onOpenChange={setShowImportDialog} onImportOrders={bulkImportOrders} loading={loading} />
        <CurrencyRatesDialog open={showCurrencyDialog} onOpenChange={setShowCurrencyDialog} />
        <PaymentSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
        <ReAuthDialog
          open={showReAuthDialog}
          onOpenChange={setShowReAuthDialog}
          onSuccess={() => {
            if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
              clearAllOrders();
            }
          }}
          title="Clear All Data - Authentication Required"
          description="This is a destructive action. Please re-enter your credentials to confirm your identity."
        />
      </div>
    </CurrencyDisplayProvider>
  );
};

export default AmazonFulfillmentTracker;
