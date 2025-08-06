import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { POFileUpload } from './po/POFileUpload';
import { SKUList } from './po/SKUList';
import { POOrderTracking } from './po/POOrderTracking';
import { AddSKUDialog } from './po/AddSKUDialog';
import { usePOTracker } from '@/hooks/usePOTracker';

export function POTracker() {
  const [activeTab, setActiveTab] = useState('upload');
  const [searchTerm, setSearchTerm] = useState('');
  
  const {
    sunskySKUs,
    poOrders,
    isLoading,
    addSKUs,
    processPOFiles,
    updateOrderStatus
  } = usePOTracker();

  const handleFileUpload = async (mappedData: any[]) => {
    try {
      await processPOFiles(mappedData);
    } catch (error) {
      console.error('Error processing PO files:', error);
    }
  };

  const filteredSKUs = sunskySKUs.filter(sku => 
    sku.sku_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const totalSKUs = sunskySKUs.length;
  const totalOrders = poOrders.length;
  const pendingOrders = poOrders.filter(order => order.status === 'pending').length;
  const placedOrders = poOrders.filter(order => order.status === 'placed').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSKUs}</div>
            <p className="text-xs text-muted-foreground">
              Sunsky supplier SKUs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PO Orders</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Purchase orders tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting placement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{placedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Orders with supplier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">PO Upload</TabsTrigger>
          <TabsTrigger value="tracking">Order Tracking</TabsTrigger>
          <TabsTrigger value="skus">SKU Management</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Upload</CardTitle>
              <CardDescription>
                Upload PO files (Excel/CSV) to match SKUs and track orders. Supports single or multiple files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <POFileUpload onFilesUpload={handleFileUpload} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PO Order Tracking</CardTitle>
              <CardDescription>
                Track the status of purchase orders - which items are placed, pending, or need attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <POOrderTracking 
                orders={poOrders} 
                onUpdateStatus={updateOrderStatus}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sunsky SKU Database</CardTitle>
              <CardDescription>
                Manage SKUs for Sunsky supplier. Add new SKUs or search existing ones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search SKUs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <AddSKUDialog onAddSKUs={addSKUs} isLoading={isLoading} />
              </div>
              
              <SKUList skus={filteredSKUs} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}