import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Calendar } from 'lucide-react';
import { SunskySKU } from '@/hooks/usePOTracker';

interface SKUListProps {
  skus: SunskySKU[];
  isLoading: boolean;
}

export function SKUList({ skus, isLoading }: SKUListProps) {
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
              <TableHead>Cost</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skus.map((sku) => (
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
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(sku.created_at).toLocaleDateString()}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}