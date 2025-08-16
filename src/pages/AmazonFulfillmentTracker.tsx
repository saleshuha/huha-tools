import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, DollarSign } from 'lucide-react';
import { MetricsDashboard } from '@/components/amazon/MetricsDashboard';
import { OrdersTable } from '@/components/amazon/OrdersTable';
import { ImportOrdersDialog } from '@/components/amazon/ImportOrdersDialog';
import { CurrencyRatesDialog } from '@/components/amazon/CurrencyRatesDialog';
import { CurrencyDisplayProvider, CurrencySelector } from '@/components/amazon/CurrencySelector';
import { useAmazonOrders } from '@/hooks/useAmazonOrders';
import { useCountry } from '@/contexts/CountryContext';
import { useUserProfile } from '@/hooks/useUserProfile';

const AmazonFulfillmentTracker = () => {
  const { selectedCountry } = useCountry();
  const { profile } = useUserProfile();
  const { orders, loading, metrics, updateOrder, deleteOrder, bulkImportOrders, clearAllOrders } = useAmazonOrders();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);

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
            {profile?.role === 'admin' && (
              <Button variant="destructive" onClick={clearAllOrders} size="sm">
                Clear All Data
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Orders Management</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <MetricsDashboard metrics={metrics} loading={loading} />
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
        </div>
      </div>
    </CurrencyDisplayProvider>
  );
};

export default AmazonFulfillmentTracker;