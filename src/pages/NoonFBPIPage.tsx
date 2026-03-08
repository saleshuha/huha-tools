import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Settings, History } from 'lucide-react';
import { FBPIOrdersList } from '@/components/noon-fbpi/FBPIOrdersList';
import { FBPISettings } from '@/components/noon-fbpi/FBPISettings';
import { useNoonFBPI } from '@/hooks/useNoonFBPI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function NoonFBPIPage() {
  const {
    stores,
    orders,
    loading,
    storesLoading,
    testConnection,
    fetchOrder,
    updateOrder,
    updateStoreCredentials,
    refreshOrders,
    webhookKeys,
    generateWebhookKey,
    revokeWebhookKey,
    deleteWebhookKey,
    testWebhook,
  } = useNoonFBPI();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Noon FBPI Orders</h1>
        <p className="text-sm text-muted-foreground">
          Fulfilled by Partner Integration — fetch orders and match with inventory
        </p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <FBPIOrdersList
            stores={stores}
            orders={orders}
            loading={loading}
            onFetchOrder={fetchOrder}
            onUpdateOrder={updateOrder}
            onRefresh={refreshOrders}
          />
        </TabsContent>

        <TabsContent value="settings">
          <FBPISettings
            stores={stores}
            orders={orders}
            loading={loading}
            webhookKeys={webhookKeys}
            onTestConnection={testConnection}
            onUpdateCredentials={updateStoreCredentials}
            onGenerateWebhookKey={generateWebhookKey}
            onRevokeWebhookKey={revokeWebhookKey}
            onDeleteWebhookKey={deleteWebhookKey}
            onTestWebhook={testWebhook}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No order history yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Fetched At</TableHead>
                      <TableHead>Processed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.fbpi_order_nr}</TableCell>
                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                        <TableCell>{Array.isArray(order.items) ? order.items.length : 0}</TableCell>
                        <TableCell className="text-sm">
                          {order.fetched_at ? format(new Date(order.fetched_at), 'MMM dd, yyyy HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.processed_at ? format(new Date(order.processed_at), 'MMM dd, yyyy HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
