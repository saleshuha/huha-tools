import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Search, Package, ShoppingCart, Truck, Archive, RefreshCw, AlertCircle } from 'lucide-react';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';
import { useInventoryData } from '@/hooks/useInventoryData';
import { usePOOrders } from '@/hooks/usePOOrders';
import { LabelDataset, LabelDomain } from '@/types/label';
import { toast } from 'sonner';

interface DomainDataMapperProps {
  domain: LabelDomain;
}

export const DomainDataMapper: React.FC<DomainDataMapperProps> = ({ domain }) => {
  const { setDataset } = useLabelDoc();
  const {
    inventory,
    orders,
    noonOrders,
    loading,
    error,
    fetchInventory,
    fetchProcessedOrders,
    fetchNoonOrders,
    searchInventory,
    searchNoonOrders,
  } = useInventoryData();
  
  const { poOrders, isLoading: poLoading, fetchPOOrders } = usePOOrders();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Auto-load data when component mounts based on domain
  useEffect(() => {
    switch (domain) {
      case 'inventory':
        fetchInventory();
        break;
      case 'amazon':
        fetchProcessedOrders();
        break;
      case 'noon':
        fetchNoonOrders();
        break;
      case 'po':
        fetchPOOrders();
        break;
    }
  }, [domain]);

  const handleLoadInventoryData = () => {
    const dataset: LabelDataset = {
      id: 'inventory',
      name: 'Inventory Data',
      description: 'Current inventory items',
      headers: ['ASIN', 'SKU', 'Title', 'Quantity', 'Serial', 'Status'],
      data: inventory.map(item => [
        item.asin || '',
        item.sku || '',
        item.title || '',
        item.quantity?.toString() || '0',
        item.serial_number || '',
        item.status || 'in-stock'
      ]),
      rowCount: inventory.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDataset(dataset);
    toast.success(`Loaded ${inventory.length} inventory items`);
  };

  const handleLoadOrdersData = () => {
    const dataset: LabelDataset = {
      id: 'orders',
      name: 'Amazon Orders',
      description: 'Processed Amazon orders',
      headers: ['Order ID', 'ASIN', 'SKU', 'Title', 'Quantity', 'Status'],
      data: orders.map(order => [
        order.order_number || '',
        order.asin || '',
        order.sku || '',
        order.item_title || '',
        order.quantity_processed?.toString() || '1',
        order.match_type || 'pending'
      ]),
      rowCount: orders.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDataset(dataset);
    toast.success(`Loaded ${orders.length} Amazon orders`);
  };

  const handleLoadNoonOrdersData = () => {
    const dataset: LabelDataset = {
      id: 'noon-orders',
      name: 'Noon Orders',
      description: 'Noon marketplace orders',
      headers: ['Order Number', 'Purchase Item', 'SKU', 'Partner SKU', 'Title', 'Quantity', 'Status'],
      data: noonOrders.map(order => [
        order.order_nr || '',
        order.purchase_item_nr || '',
        order.sku || '',
        order.partner_sku || '',
        order.title || '',
        order.quantity?.toString() || '1',
        order.item_status || 'pending'
      ]),
      rowCount: noonOrders.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDataset(dataset);
    toast.success(`Loaded ${noonOrders.length} Noon orders`);
  };

  const handleLoadPOData = () => {
    const dataset: LabelDataset = {
      id: 'po-orders',
      name: 'PO Items',
      description: 'Purchase order items',
      headers: ['PO Number', 'Priority', 'Model Number', 'ASIN', 'SKU', 'Title', 'Quantity', 'Status', 'Ship To'],
      data: poOrders.map(po => [
        po.po_number || '',
        po.priority?.toString() || '3',
        po.model_number || '',
        po.asin || '',
        po.sku_code || '',
        po.title || '',
        po.quantity?.toString() || '1',
        po.status || 'pending',
        po.ship_to_location || ''
      ]),
      rowCount: poOrders.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDataset(dataset);
    toast.success(`Loaded ${poOrders.length} PO items`);
  };

  const handleRefresh = () => {
    switch (domain) {
      case 'inventory':
        fetchInventory();
        break;
      case 'amazon':
        fetchProcessedOrders();
        break;
      case 'noon':
        fetchNoonOrders();
        break;
      case 'po':
        fetchPOOrders();
        break;
    }
  };

  const getDomainInfo = () => {
    switch (domain) {
      case 'inventory':
        return {
          title: 'Inventory Data',
          icon: <Archive className="h-5 w-5" />,
          data: inventory,
          loading: loading,
          loadAction: handleLoadInventoryData,
          buttonText: 'Load Inventory Data'
        };
      case 'amazon':
        return {
          title: 'Amazon Orders',
          icon: <Package className="h-5 w-5" />,
          data: orders,
          loading: loading,
          loadAction: handleLoadOrdersData,
          buttonText: 'Load Amazon Orders'
        };
      case 'noon':
        return {
          title: 'Noon Orders',
          icon: <ShoppingCart className="h-5 w-5" />,
          data: noonOrders,
          loading: loading,
          loadAction: handleLoadNoonOrdersData,
          buttonText: 'Load Noon Orders'
        };
      case 'po':
        return {
          title: 'PO Items',
          icon: <Truck className="h-5 w-5" />,
          data: poOrders,
          loading: poLoading,
          loadAction: handleLoadPOData,
          buttonText: 'Load PO Items'
        };
      default:
        return {
          title: 'Data Source',
          icon: <Database className="h-5 w-5" />,
          data: [],
          loading: false,
          loadAction: () => {},
          buttonText: 'Load Data'
        };
    }
  };

  const domainInfo = getDomainInfo();
  const isLoading = domainInfo.loading;
  const hasData = domainInfo.data.length > 0;

  return (
    <Card className="h-full border-2 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {domainInfo.icon}
          {domainInfo.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {hasData ? `${domainInfo.data.length} items` : 'No data loaded'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 min-h-0">
        <Button
          onClick={domainInfo.loadAction}
          disabled={isLoading || !hasData}
          className="w-full"
        >
          <Database className="h-4 w-4 mr-2" />
          {domainInfo.buttonText}
        </Button>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${domainInfo.title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-64">
          <div className="space-y-2">
            {!hasData && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                {domainInfo.icon}
                <p className="text-sm mt-2">No {domainInfo.title.toLowerCase()} available</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                <p className="text-sm">Loading {domainInfo.title.toLowerCase()}...</p>
              </div>
            )}

            {hasData && domainInfo.data.slice(0, 50).map((item: any, index: number) => {
              const isSelected = selectedItemIndex === index;
              
              const handleItemClick = () => {
                setSelectedItemIndex(index);
                
                // Create dataset for this single item
                let dataset: LabelDataset;
                
                if (domain === 'inventory') {
                  dataset = {
                    id: 'inventory-item',
                    name: 'Selected Inventory Item',
                    description: `Item: ${item.title || 'Untitled'}`,
                    headers: ['ASIN', 'SKU', 'Title', 'Quantity', 'Serial', 'Status'],
                    data: [[
                      item.asin || '',
                      item.sku || '',
                      item.title || '',
                      item.quantity?.toString() || '0',
                      item.serial_number || '',
                      item.status || 'in-stock'
                    ]],
                    rowCount: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                } else if (domain === 'amazon') {
                  dataset = {
                    id: 'order-item',
                    name: 'Selected Amazon Order',
                    description: `Order: ${item.order_number || 'N/A'}`,
                    headers: ['Order ID', 'ASIN', 'SKU', 'Title', 'Quantity', 'Status'],
                    data: [[
                      item.order_number || '',
                      item.asin || '',
                      item.sku || '',
                      item.item_title || '',
                      item.quantity_processed?.toString() || '1',
                      item.match_type || 'pending'
                    ]],
                    rowCount: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                } else if (domain === 'noon') {
                  dataset = {
                    id: 'noon-order-item',
                    name: 'Selected Noon Order',
                    description: `Order: ${item.order_nr || 'N/A'}`,
                    headers: ['Order Number', 'Purchase Item', 'SKU', 'Partner SKU', 'Title', 'Quantity', 'Status'],
                    data: [[
                      item.order_nr || '',
                      item.purchase_item_nr || '',
                      item.sku || '',
                      item.partner_sku || '',
                      item.title || '',
                      item.quantity?.toString() || '1',
                      item.item_status || 'pending'
                    ]],
                    rowCount: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                } else if (domain === 'po') {
                  dataset = {
                    id: 'po-item',
                    name: 'Selected PO Item',
                    description: `PO: ${item.po_number || 'N/A'}`,
                    headers: ['PO Number', 'ASIN', 'SKU', 'Model', 'Title', 'Quantity', 'Status', 'Supplier'],
                    data: [[
                      item.po_number || '',
                      item.asin || '',
                      item.sku_code || '',
                      item.model_number || '',
                      item.title || '',
                      item.quantity?.toString() || '0',
                      item.status || 'pending',
                      item.supplier_name || ''
                    ]],
                    rowCount: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                } else {
                  dataset = {
                    id: 'selected-item',
                    name: 'Selected Item',
                    description: 'Single item selected',
                    headers: ['Data'],
                    data: [['No data']],
                    rowCount: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                }
                
                setDataset(dataset);
                toast.success(`Selected item - columns mapped to canvas`);
              };
              
              return (
                <div 
                  key={index} 
                  onClick={handleItemClick}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-primary/10 border-primary shadow-sm' 
                      : 'hover:bg-accent/20 border-border'
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {item.title || item.item_title || 'Untitled Item'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {domain === 'inventory' && `ASIN: ${item.asin || 'N/A'} • SKU: ${item.sku || 'N/A'}`}
                    {domain === 'amazon' && `Order: ${item.order_number || 'N/A'} • ASIN: ${item.asin || 'N/A'}`}
                    {domain === 'noon' && `Order: ${item.order_nr || 'N/A'} • SKU: ${item.sku || 'N/A'}`}
                    {domain === 'po' && `PO: ${item.po_number || 'N/A'} • Model: ${item.model_number || 'N/A'}`}
                  </div>
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-primary/20">
                      <Badge variant="default" className="text-xs">
                        Selected - Mapped to Canvas
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};