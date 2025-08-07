import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Calendar, Calculator, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { SunskySKU } from '@/hooks/useSKUManager';

interface SKUListProps {
  skus: SunskySKU[];
  shippingRate: number;
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function SKUList({ skus, shippingRate, isLoading, hasMore, onLoadMore }: SKUListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Memoize expensive calculations
  const { totalPages, currentSkus, startIndex, endIndex } = useMemo(() => {
    const totalPages = Math.ceil(skus.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, skus.length);
    const currentSkus = skus.slice(startIndex, endIndex);
    
    return { totalPages, currentSkus, startIndex, endIndex };
  }, [skus, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page
  };
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (skus.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Sunsky SKUs Found</h3>
          <p className="text-muted-foreground max-w-sm">
            Add SKUs to your Sunsky database to start tracking purchase orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Sunsky SKUs ({skus.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Product Cost</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Shipping Cost</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentSkus.map((sku) => {
              // Memoized calculations for better performance
              const shippingCost = sku.weight ? (sku.weight * shippingRate) : 0;
              const totalCost = (sku.cost || 0) + shippingCost;
              
              return (
                <TableRow key={sku.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {sku.sku_code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate font-medium">
                      {sku.title || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sku.cost ? (
                      <Badge variant="secondary">
                        {sku.cost.toFixed(2)} {sku.currency || 'AED'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sku.weight ? (
                      <Badge variant="outline">
                        {sku.weight} g
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sku.weight ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        <Calculator className="h-3 w-3 mr-1" />
                        {shippingCost.toFixed(2)} {sku.currency || 'AED'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sku.cost && sku.weight ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        {totalCost.toFixed(2)} {sku.currency || 'AED'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(sku.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {/* Load More Button and Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {endIndex} of {skus.length} SKUs
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              {hasMore && onLoadMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Load More'
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {totalPages <= 7 ? (
                  // Show all pages if 7 or fewer
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))
                ) : (
                  // Smart pagination for many pages
                  <>
                    <Button
                      variant={currentPage === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(1)}
                      className="w-8 h-8 p-0"
                    >
                      1
                    </Button>
                    {currentPage > 3 && <span className="px-2 text-muted-foreground">...</span>}
                    {Array.from({ length: 3 }, (_, i) => currentPage - 1 + i)
                      .filter(page => page > 1 && page < totalPages)
                      .map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))
                    }
                    {currentPage < totalPages - 2 && <span className="px-2 text-muted-foreground">...</span>}
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      className="w-8 h-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}