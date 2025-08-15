import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { MetricsDashboard } from '@/components/amazon/MetricsDashboard';
import { OrdersTable } from '@/components/amazon/OrdersTable';
import { AddOrderDialog } from '@/components/amazon/AddOrderDialog';
import { ImportOrdersDialog } from '@/components/amazon/ImportOrdersDialog';
import { useAmazonOrders } from '@/hooks/useAmazonOrders';
import { useCountry } from '@/contexts/CountryContext';

const AmazonFulfillmentTracker = () => {
  const { selectedCountry } = useCountry();
  const { orders, loading, metrics, createOrder, updateOrder, deleteOrder, bulkImportOrders } = useAmazonOrders();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  return (
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
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Orders
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Order
            </Button>
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
        <AddOrderDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onCreateOrder={createOrder}
          loading={loading}
        />
        
        <ImportOrdersDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportOrders={bulkImportOrders}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AmazonFulfillmentTracker;