import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown, Trash2, Package } from 'lucide-react';
import { AmazonReturn } from '@/types/amazon-returns';
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

type SortField = 'asin' | 'shipped_units' | 'returned_units' | 'return_ratio' | 'upload_date';
type SortDirection = 'asc' | 'desc';

export const ReturnsDataTable: React.FC<ReturnsDataTableProps> = ({
  returns,
  loading,
  onDelete,
  onBulkDelete,
}) => {
  const [sortField, setSortField] = useState<SortField>('return_ratio');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
                <Button variant="ghost" size="sm" onClick={() => handleSort('upload_date')}>
                  Upload Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    <img
                      src={`https://images-na.ssl-images-amazon.com/images/P/${item.asin}.jpg`}
                      alt={item.product_title || item.asin}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium">{item.asin}</span>
                    <span className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                      {item.product_title || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{item.shipped_units.toLocaleString()}</TableCell>
                <TableCell>{item.returned_units.toLocaleString()}</TableCell>
                <TableCell>{getReturnRatioBadge(Number(item.return_ratio))}</TableCell>
                <TableCell>{new Date(item.upload_date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
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
