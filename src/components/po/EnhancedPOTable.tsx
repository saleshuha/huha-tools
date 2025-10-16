import { useState } from 'react';
import { Edit, ExternalLink, Package, PackageCheck, PackageX, Trash2, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedPOTableProps {
  orders: any[];
  selectedItems: Set<string>;
  onItemSelect: (itemId: string) => void;
  onSelectAll: () => void;
  onIndividualAction: (order: any, action: string) => void;
  findInventoryMatch: (asin: string, sunskySku?: string, poSku?: string, modelNumber?: string) => any;
}

export function EnhancedPOTable({
  orders,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onIndividualAction,
  findInventoryMatch,
}: EnhancedPOTableProps) {
  const allSelected = orders.length > 0 && orders.every(order => selectedItems.has(order.id));
  const someSelected = orders.some(order => selectedItems.has(order.id));

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20', icon: null },
      placed: { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', icon: null },
      received: { color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20', icon: null },
      closed: { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', icon: null },
      cancelled: { color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20', icon: null },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant="outline" className={`${config.color} capitalize`}>
        {status}
      </Badge>
    );
  };

  const getInventoryBadge = (inventoryMatch: any) => {
    if (!inventoryMatch) {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
          Not Found
        </Badge>
      );
    }

    if (inventoryMatch.quantity > 0) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
          ✓ In Stock ({inventoryMatch.quantity})
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
        Out of Stock
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="border border-border/40 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b-2 border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] pl-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                ASIN / SKU
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Product Details
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-center">
                ASN Qty
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-center">
                Pending
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Inventory
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Cost
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Tracking
              </TableHead>
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground pr-4">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, index) => {
              const inventoryMatch = findInventoryMatch(
                order.asin,
                order.sunsky_sku?.sku_code,
                order.sku_code,
                order.model_number
              );

              // Calculate quantities
              const orderQuantity = order.quantity || 0;
              const pendingQty = order.status === 'closed' ? 0 : orderQuantity;
              const fulfilledQty = order.status === 'closed' ? orderQuantity : 0;

              return (
                <TableRow
                  key={order.id}
                  className={`
                    group
                    transition-all duration-200 ease-in-out
                    hover:bg-muted/40 hover:shadow-sm
                    ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}
                    ${selectedItems.has(order.id) ? 'bg-primary/5 border-l-4 border-l-primary shadow-sm' : 'border-l-4 border-l-transparent'}
                  `}
                >
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selectedItems.has(order.id)}
                      onCheckedChange={() => onItemSelect(order.id)}
                      className="data-[state=checked]:bg-primary transition-all"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1.5">
                      <code className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md font-mono font-medium">
                        {order.asin}
                      </code>
                      {order.sku_code && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="opacity-70">SKU:</span>
                          <span className="font-mono">{order.sku_code}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[300px]">
                    <div className="space-y-1.5">
                      <div className="font-medium line-clamp-2 text-sm leading-tight">
                        {order.title || 'N/A'}
                      </div>
                      {order.model_number && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="opacity-70">Model:</span>
                          <span className="font-mono">{order.model_number}</span>
                        </div>
                      )}
                      {order.sunsky_sku?.sku_code && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 font-medium">
                          <span className="opacity-70 mr-1">Sunsky:</span>
                          {order.sunsky_sku.sku_code}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted font-bold text-base">
                      {orderQuantity}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    {pendingQty > 0 ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                        <Clock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-semibold text-sm text-yellow-700 dark:text-yellow-400">
                          {pendingQty}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        <span className="font-semibold text-sm text-green-700 dark:text-green-400">
                          0
                        </span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>

                  <TableCell>
                    {getInventoryBadge(inventoryMatch)}
                    {inventoryMatch && inventoryMatch.serialNumber && (
                      <div className="text-xs text-muted-foreground mt-1">
                        SN: {inventoryMatch.serialNumber}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {order.unit_cost} {order.currency}
                      </div>
                      {order.total_cost && (
                        <div className="text-xs text-muted-foreground">
                          Total: {order.total_cost} {order.currency}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {order.tracking_number ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-xs">
                              ✓ Tracked
                            </Badge>
                            {order.tracking_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => window.open(order.tracking_url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <div><strong>Tracking:</strong> {order.tracking_number}</div>
                            {order.supplier_order_number && (
                              <div><strong>Supplier Order:</strong> {order.supplier_order_number}</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20 text-xs">
                        No Tracking
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={() => onIndividualAction(order, 'edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="text-xs font-medium">Edit tracking info</p>
                        </TooltipContent>
                      </Tooltip>

                      {inventoryMatch && inventoryMatch.quantity > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-all"
                              onClick={() => onIndividualAction(order, 'stock')}
                            >
                              <PackageCheck className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="text-xs font-medium">Mark from stock</p>
                            <p className="text-xs text-muted-foreground">({inventoryMatch.quantity} available)</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {orders.length === 0 && (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted/30 mb-4">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Try adjusting your filters or search criteria to see more results
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
