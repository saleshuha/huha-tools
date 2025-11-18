import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown, Trash2, Package } from 'lucide-react';
import { AmazonReturn } from '@/types/amazon-returns';
import { useProductImages } from '@/hooks/useProductImages';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface ReturnsDataTableProps {
  returns: AmazonReturn[];
  loading: boolean;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
}

type SortField = 'asin' | 'shipped_units' | 'returned_units' | 'return_ratio' | 'upload_date' | 'confidence_score' | 'priority_score' | 'impact_score';
type SortDirection = 'asc' | 'desc';

export const ReturnsDataTable: React.FC<ReturnsDataTableProps> = ({
  returns,
  loading,
  onDelete,
  onBulkDelete,
}) => {
  const { productImages } = useProductImages();
  const [sortField, setSortField] = useState<SortField>('priority_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Get image URL for an ASIN
  const getImageUrl = (asin: string) => {
    const productImage = productImages?.find(img => img.asin === asin);
    return productImage?.image_url;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedReturns = [...returns].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'upload_date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedReturns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReturns = sortedReturns.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [returns.length]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(returns.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const getReturnRatioBadge = (ratio: number) => {
    if (ratio > 20) {
      return <Badge variant="destructive">{ratio.toFixed(2)}%</Badge>;
    } else if (ratio > 10) {
      return <Badge className="bg-yellow-500">{ratio.toFixed(2)}%</Badge>;
    } else {
      return <Badge className="bg-green-600">{ratio.toFixed(2)}%</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (returns.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <p className="text-lg text-muted-foreground mb-2">No returns data found</p>
        <p className="text-sm text-muted-foreground">Upload a file to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === returns.length && returns.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('asin')}>
                  Product
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('shipped_units')}>
                  Shipped
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('returned_units')}>
                  Returned
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('return_ratio')}>
                  Ratio
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('confidence_score')}>
                  Confidence
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('priority_score')}>
                  Priority
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('upload_date')}>
                  Upload Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReturns.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="w-16 h-16 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                    {getImageUrl(item.asin) ? (
                      <img
                        src={getImageUrl(item.asin)}
                        alt={item.product_title || item.asin}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-2xl">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium">{item.asin}</span>
                    <span className="text-sm text-muted-foreground line-clamp-3">
                      {item.product_title || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{item.shipped_units.toLocaleString()}</TableCell>
                <TableCell>{item.returned_units.toLocaleString()}</TableCell>
                <TableCell>{getReturnRatioBadge(Number(item.return_ratio))}</TableCell>
                <TableCell>
                  <Badge variant={item.confidence_score > 70 ? 'default' : item.confidence_score > 30 ? 'secondary' : 'outline'}>
                    {item.confidence_score.toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={
                      item.priority_score > 85 ? 'bg-destructive text-destructive-foreground' :
                      item.priority_score > 70 ? 'bg-orange-500 text-white' :
                      item.priority_score > 50 ? 'bg-yellow-500 text-black' :
                      'bg-green-600 text-white'
                    }
                  >
                    {item.priority_score.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(item.upload_date).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <PaginationItem key={page}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return null;
            })}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the return data record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
