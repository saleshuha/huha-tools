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
import { ViewMode } from '@/components/po/POTableViewMode';
import { ColumnConfig } from '@/components/po/POTableColumnManager';
import { truncateText } from '@/utils/po-table-helpers';

interface EnhancedPOTableProps {
  orders: any[];
  selectedItems: Set<string>;
  onItemSelect: (itemId: string) => void;
  onSelectAll: () => void;
  onIndividualAction: (order: any, action: string) => void;
  findInventoryMatch: (asin: string, sunskySku?: string, poSku?: string, modelNumber?: string) => any;
  viewMode?: ViewMode;
  visibleColumns?: ColumnConfig[];
}

export function EnhancedPOTable({
  orders,
  selectedItems,
  onItemSelect,
  onSelectAll,
  onIndividualAction,
  findInventoryMatch,
  viewMode = 'comfortable',
  visibleColumns = [],
}: EnhancedPOTableProps) {
  const allSelected = orders.length > 0 && orders.every(order => selectedItems.has(order.id));
  const someSelected = orders.some(order => selectedItems.has(order.id));

  // Check if column is visible
  const isColumnVisible = (columnId: string) => {
    const column = visibleColumns.find(col => col.id === columnId);
    return column ? column.visible : true;
  };

  // Get view mode specific classes
  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'compact':
        return {
          header: 'h-8 px-3 text-[10px]',
          cell: 'py-1.5 px-3 text-xs',
          badge: 'text-[10px] px-1.5 py-0.5',
          title: 'text-xs',
        };
      case 'detailed':
        return {
          header: 'h-14 px-5 text-sm',
          cell: 'py-4 px-5',
          badge: 'text-xs px-2.5 py-1',
          title: 'text-base',
        };
      default: // comfortable
        return {
          header: 'h-11 px-4 text-xs',
          cell: 'py-3 px-4 text-sm',
          badge: 'text-xs px-2 py-0.5',
          title: 'text-sm',
        };
    }
  };

  const classes = getViewModeClasses();

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
              {isColumnVisible('checkbox') && (
                <TableHead className={`w-[50px] pl-4 ${classes.header}`}>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                  />
                </TableHead>
              )}
              {isColumnVisible('title') && (
                <TableHead className={`font-semibold uppercase tracking-wide text-muted-foreground ${classes.header}`}>
                  Product Information
                </TableHead>
              )}
              {isColumnVisible('quantity') && (
                <TableHead className={`font-semibold uppercase tracking-wide text-muted-foreground text-center ${classes.header}`}>
                  {viewMode === 'compact' ? 'Qty' : 'ASN Qty'}
                </TableHead>
              )}
              {isColumnVisible('quantity') && (
                <TableHead className={`font-semibold uppercase tracking-wide text-muted-foreground text-center ${classes.header}`}>
                  Pending
                </TableHead>
              )}
              {isColumnVisible('status') && (
                <TableHead className={`font-semibold uppercase tracking-wide text-muted-foreground ${classes.header}`}>
                  Status
                </TableHead>
              )}
              {isColumnVisible('inventory') && (
                <TableHead className={`font-semibold uppercase tracking-wide text-muted-foreground ${classes.header}`}>
                  Inventory
                </TableHead>
              )}
              {isColumnVisible('tracking') && (
                <TableHead className={`font-semibold uppercase tracking-wide text-muted-foreground ${classes.header}`}>
                  Tracking
                </TableHead>
              )}
              {isColumnVisible('actions') && (
                <TableHead className={`text-right font-semibold uppercase tracking-wide text-muted-foreground pr-4 ${classes.header}`}>
                  Actions
                </TableHead>
              )}
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

              const hasStock = inventoryMatch && inventoryMatch.quantity > 0;

              return (
                <TableRow
                  key={order.id}
                  className={`
                    group
                    transition-all duration-200 ease-in-out
                    hover:bg-muted/40 hover:shadow-sm
                    ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}
                    ${selectedItems.has(order.id) ? 'bg-primary/5 border-l-4 border-l-primary shadow-sm' : 'border-l-4 border-l-transparent'}
                    ${hasStock ? 'border-r-2 border-r-green-500/30' : ''}
                  `}
                >
                  {isColumnVisible('checkbox') && (
                    <TableCell className={`pl-4 ${classes.cell}`}>
                      <Checkbox
                        checked={selectedItems.has(order.id)}
                        onCheckedChange={() => onItemSelect(order.id)}
                        className="data-[state=checked]:bg-primary transition-all"
                      />
                    </TableCell>
                  )}

                  {isColumnVisible('title') && (
                    <TableCell className={`max-w-[500px] ${classes.cell}`}>
                      <div className="flex items-start gap-3">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {order.image_url ? (
                            <img 
                              src={order.image_url} 
                              alt={order.title || 'Product'} 
                              className={`${viewMode === 'compact' ? 'w-12 h-12' : viewMode === 'detailed' ? 'w-20 h-20' : 'w-16 h-16'} object-contain rounded-md border border-border bg-white`}
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/80?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className={`${viewMode === 'compact' ? 'w-12 h-12' : viewMode === 'detailed' ? 'w-20 h-20' : 'w-16 h-16'} bg-muted rounded-md border border-border flex items-center justify-center`}>
                              <Package className={`${viewMode === 'compact' ? 'h-5 w-5' : 'h-8 w-8'} text-muted-foreground/50`} />
                            </div>
                          )}
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* ASIN */}
                          <code className={`${classes.badge} bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono font-medium inline-block`}>
                            {viewMode === 'compact' ? truncateText(order.asin, 10) : order.asin}
                          </code>
                          
                          {/* Title */}
                          <div className={`font-medium ${viewMode === 'compact' ? 'line-clamp-1' : 'line-clamp-2'} ${classes.title} leading-tight`}>
                            {viewMode === 'compact' ? truncateText(order.title || 'N/A', 40) : order.title || 'N/A'}
                          </div>
                          
                          {/* SKU and Model Number */}
                          <div className="flex flex-wrap gap-2 items-center">
                            {order.sku_code && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="opacity-70">SKU:</span>
                                <span className="font-mono">{order.sku_code}</span>
                              </div>
                            )}
                            {order.model_number && viewMode === 'detailed' && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="opacity-70">Model:</span>
                                <span className="font-mono">{order.model_number}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Sunsky SKU Badge */}
                          {order.sunsky_sku?.sku_code && viewMode !== 'compact' && (
                            <Badge variant="outline" className={`${classes.badge} bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20`}>
                              <span className="opacity-70 mr-1">Sunsky:</span>
                              {order.sunsky_sku.sku_code}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {isColumnVisible('quantity') && (
                    <TableCell className={`text-center ${classes.cell}`}>
                      <div className={`inline-flex items-center justify-center ${viewMode === 'compact' ? 'h-6 w-6' : 'h-8 w-8'} rounded-full bg-muted font-bold ${classes.title}`}>
                        {orderQuantity}
                      </div>
                    </TableCell>
                  )}

                  {isColumnVisible('quantity') && (
                    <TableCell className={`text-center ${classes.cell}`}>
                      {pendingQty > 0 ? (
                        <div className={`inline-flex items-center gap-1 ${classes.badge} px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20`}>
                          <Clock className={`${viewMode === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-yellow-600 dark:text-yellow-400`} />
                          <span className="font-semibold text-yellow-700 dark:text-yellow-400">
                            {pendingQty}
                          </span>
                        </div>
                      ) : (
                        <div className={`inline-flex items-center gap-1 ${classes.badge} px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20`}>
                          <CheckCircle className={`${viewMode === 'compact' ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-green-600 dark:text-green-400`} />
                          <span className="font-semibold text-green-700 dark:text-green-400">
                            0
                          </span>
                        </div>
                      )}
                    </TableCell>
                  )}

                  {isColumnVisible('status') && (
                    <TableCell className={classes.cell}>
                      {getStatusBadge(order.status)}
                    </TableCell>
                  )}

                  {isColumnVisible('inventory') && (
                    <TableCell className={classes.cell}>
                      {getInventoryBadge(inventoryMatch)}
                      {inventoryMatch && inventoryMatch.serialNumber && viewMode !== 'compact' && (
                        <div className="text-xs text-muted-foreground mt-1">
                          SN: {inventoryMatch.serialNumber}
                        </div>
                      )}
                    </TableCell>
                  )}

                  {isColumnVisible('tracking') && (
                    <TableCell className={classes.cell}>
                      {order.tracking_number ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <Badge variant="outline" className={`${classes.badge} bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20`}>
                                ✓ {viewMode === 'compact' ? '' : 'Tracked'}
                              </Badge>
                              {order.tracking_url && viewMode !== 'compact' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
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
                        <Badge variant="outline" className={`${classes.badge} bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20`}>
                          {viewMode === 'compact' ? 'N/A' : 'No Tracking'}
                        </Badge>
                      )}
                    </TableCell>
                  )}

                  {isColumnVisible('actions') && (
                    <TableCell className={`text-right pr-4 ${classes.cell}`}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-all"
                              onClick={() => onIndividualAction(order, 'edit')}
                            >
                              <Edit className={`${viewMode === 'compact' ? 'h-3 w-3' : 'h-4 w-4'}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="text-xs font-medium">Edit tracking</p>
                          </TooltipContent>
                        </Tooltip>

                        {hasStock && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10 transition-all"
                                onClick={() => onIndividualAction(order, 'stock')}
                              >
                                <PackageCheck className={`${viewMode === 'compact' ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs font-medium">Mark from stock</p>
                              <p className="text-xs text-muted-foreground">({inventoryMatch?.quantity} available)</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  )}
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
