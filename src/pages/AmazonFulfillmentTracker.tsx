import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, DollarSign } from 'lucide-react';
import { MetricsDashboard } from '@/components/amazon/MetricsDashboard';
import { OrdersTable } from '@/components/amazon/OrdersTable';
import { ImportOrdersDialog } from '@/components/amazon/ImportOrdersDialog';
import { CurrencyRatesDialog } from '@/components/amazon/CurrencyRatesDialog';
import { ReAuthDialog } from '@/components/amazon/ReAuthDialog';
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

  return (
    <CurrencyDisplayProvider>
      <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Amazon Fulfillment Tracker
            </h1>
            <p className="text-muted-foreground">
              Direct fulfillment order payment tracking for {selectedCountry}
            </p>
          </div>
          <div className="flex gap-2">
            <CurrencySelector />
            <Button variant="outline" onClick={() => setShowCurrencyDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Currency Rates
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Orders
            </Button>
            {user && profile?.role === 'admin' && (
              <Button 
                variant="destructive" 
                onClick={() => setShowReAuthDialog(true)}
                size="sm"
              >
                Clear All Data
              </Button>
            )}
          </div>
        </div>

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