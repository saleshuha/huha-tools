import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Package, Calendar, Calculator, ChevronLeft, ChevronRight, Loader2, Edit, Save, X } from 'lucide-react';
import { SunskySKU } from '@/hooks/useSKUManager';
import { supabase } from '@/integrations/supabase/client';

interface SKUListProps {
  skus: SunskySKU[];
  shippingRate: number;
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSkuUpdated?: () => void;
}

export function SKUList({ skus, shippingRate, isLoading, hasMore, onLoadMore, onSkuUpdated }: SKUListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [editingSku, setEditingSku] = useState<SunskySKU | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
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

  const handleEditSku = (sku: SunskySKU) => {
    setEditingSku(sku);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSku = async (updatedData: Partial<SunskySKU>) => {
    if (!editingSku) return;

    setIsUpdating(true);
    try {
      const query = supabase
        .from('sunsky_skus')
        .update({
          title: updatedData.title,
          cost: updatedData.cost,
          weight: updatedData.weight,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', editingSku.id);

      const { error } = await (query as any);

      if (error) {
        throw error;
      }

      toast({
        title: "SKU Updated",
        description: `SKU ${editingSku.sku_code} has been updated successfully.`
      });

      setIsEditDialogOpen(false);
      setEditingSku(null);
      onSkuUpdated?.();
    } catch (error) {
      console.error('Error updating SKU:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update SKU. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
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
              <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSku(sku)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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

        {/* Edit SKU Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit SKU: {editingSku?.sku_code}</DialogTitle>
            </DialogHeader>
            {editingSku && (
              <EditSKUForm
                sku={editingSku}
                onSave={handleUpdateSku}
                onCancel={() => setIsEditDialogOpen(false)}
                isLoading={isUpdating}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Edit SKU Form Component
interface EditSKUFormProps {
  sku: SunskySKU;
  onSave: (data: Partial<SunskySKU>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditSKUForm({ sku, onSave, onCancel, isLoading }: EditSKUFormProps) {
  const [formData, setFormData] = useState({
    title: sku.title || '',
    cost: sku.cost?.toString() || '',
    weight: sku.weight?.toString() || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedData: Partial<SunskySKU> = {
      title: formData.title.trim() || null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null
    };

    onSave(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter product title"
        />
      </div>
      
      
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-cost">Cost ({sku.currency || 'AED'})</Label>
          <Input
            id="edit-cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="edit-weight">Weight (g)</Label>
          <Input
            id="edit-weight"
            type="number"
            step="0.01"
            min="0"
            value={formData.weight}
            onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>
      
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}