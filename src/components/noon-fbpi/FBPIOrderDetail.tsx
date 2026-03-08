import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { FBPIOrder, NoonStoreConfig } from '@/hooks/useNoonFBPI';

interface FBPIOrderDetailProps {
  order: FBPIOrder;
  onBack: () => void;
  onUpdateOrder: (storeId: string, payload: any) => Promise<any>;
  stores: NoonStoreConfig[];
  loading: boolean;
}

export function FBPIOrderDetail({ order, onBack, onUpdateOrder, stores, loading }: FBPIOrderDetailProps) {
  const items = Array.isArray(order.items) ? order.items : [];
  const invStatus = (order.inventory_status && typeof order.inventory_status === 'object')
    ? order.inventory_status as Record<string, any>
    : {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'low_stock': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'out_of_stock': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      in_stock: 'bg-green-600',
      low_stock: 'bg-yellow-600',
      out_of_stock: 'bg-red-600',
    };
    return (
      <Badge className={colors[status] || 'bg-muted'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">Order: {order.fbpi_order_nr}</h2>
        <Badge variant="outline">{order.status}</Badge>
      </div>

      {/* Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">MP Order:</span>
              <p className="font-medium">{order.mp_order_nr || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Country:</span>
              <p className="font-medium">{order.mp_country_code || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Warehouse:</span>
              <p className="font-medium">{order.warehouse_code || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Currency:</span>
              <p className="font-medium">{order.currency_code || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items with Inventory Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Qty Ordered</TableHead>
                <TableHead className="text-right">In Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any, idx: number) => {
                const sku = item.partnerSku || item.partner_sku || item.sku || '-';
                const inv = invStatus[sku];
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{sku}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {item.title || item.productTitle || '-'}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity || 1}</TableCell>
                    <TableCell className="text-right">
                      {inv ? inv.available_qty : '-'}
                    </TableCell>
                    <TableCell>
                      {inv ? (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(inv.status)}
                          {getStatusBadge(inv.status)}
                        </div>
                      ) : (
                        <Badge variant="secondary">Unknown</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
