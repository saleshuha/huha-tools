import { useState } from 'react';
import { HuhaHeader01 } from '@/components/ui/huha-header-01';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, DollarSign, Settings } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-surface">
      <HuhaHeader01
        icon={<DollarSign className="w-5 h-5 text-primary-foreground" />}
        title="Amazon Fulfillment Tracker"
        subtitle={`Direct fulfillment order payment tracking for ${selectedCountry}`}
        actions={[
          {
            label: '',
            icon: <CurrencySelector />,
            onClick: () => {},
            variant: 'outline' as const,
            className: 'p-0'
          },
          {
            label: 'Settings',
            icon: <Settings className="h-4 w-4 mr-2" />,
            onClick: () => setShowSettingsDialog(true),
            variant: 'outline' as const
          },
          {
            label: 'Currency Rates',
            icon: <DollarSign className="h-4 w-4 mr-2" />,
            onClick: () => setShowCurrencyDialog(true),
            variant: 'outline' as const
          },
          {
            label: 'Import Orders',
            icon: <Upload className="h-4 w-4 mr-2" />,
            onClick: () => setShowImportDialog(true),
            variant: 'outline' as const
          },
          ...(user && profile?.role === 'admin' ? [{
            label: 'Clear All Data',
            onClick: () => setShowReAuthDialog(true),
            variant: 'secondary' as const
          }] : [])
        ]}
      />
      <div className="mx-6 space-y-6">

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50">
            <TabsTrigger 
              value="dashboard" 
              className="h-10 px-6 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="h-10 px-6 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200"
            >
              Orders Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <MetricsDashboard metrics={metrics} loading={loading} orders={orders} />
            
            {/* Payment Status Row */}
            {metrics?.paidThroughDate && (
              <div className="w-full p-4 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success font-medium text-center">
                  ✓ Orders paid through: {new Date(metrics.paidThroughDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {metrics && !metrics.paidThroughDate && metrics.totalOrders > 0 && (
              <div className="w-full p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning font-medium text-center">
                  ⚠ No fully paid period found - payments pending from earliest orders
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
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

        {/* Dialogs */}
        <ImportOrdersDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportOrders={bulkImportOrders}
          loading={loading}
        />
        
        <CurrencyRatesDialog
          open={showCurrencyDialog}
          onOpenChange={setShowCurrencyDialog}
        />
        
        <PaymentSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
        />
        
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
      </div>
    </CurrencyDisplayProvider>
  );
};

export default AmazonFulfillmentTracker;
