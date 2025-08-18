import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Upload, DollarSign, Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
            <Button 
              variant="outline" 
              onClick={() => navigate('/amazon-vendor-central')}
              className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Settings className="h-4 w-4 mr-2" />
              Vendor Central
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
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

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div 
            className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200/50 cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => navigate('/amazon-vendor-central')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">Amazon Vendor Central</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">Configure inventory feed integration</p>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-300">Payment Tracking</h3>
                <p className="text-sm text-green-600 dark:text-green-400">Direct fulfillment order management</p>
              </div>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
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