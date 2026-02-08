import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Package } from 'lucide-react';
import { AmazonReturn } from '@/types/amazon-returns';
import { useProductImages } from '@/hooks/useProductImages';
import { SortableTableHeader } from '@/components/order-processing/SortableTableHeader';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const getImageUrl = (asin: string) => {
    const productImage = productImages?.find(img => img.asin === asin);
    return productImage?.image_url;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const sortedReturns = [...returns].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'upload_date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue || '').toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const showAll = itemsPerPage === 0;
  const totalPages = showAll ? 1 : Math.ceil(sortedReturns.length / itemsPerPage);
  const startIndex = showAll ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = showAll ? sortedReturns.length : startIndex + itemsPerPage;
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
      return <Badge variant="destructive" className="font-mono text-xs">{ratio.toFixed(1)}%</Badge>;
    } else if (ratio > 10) {
      return <Badge className="bg-yellow-500/90 text-yellow-950 font-mono text-xs">{ratio.toFixed(1)}%</Badge>;
    } else {
      return <Badge className="bg-emerald-500/90 text-emerald-950 font-mono text-xs">{ratio.toFixed(1)}%</Badge>;
    }
  };

  const getImpactBadge = (score: number) => {
    if (score > 500) {
      return <Badge variant="destructive" className="font-mono text-xs">{score.toLocaleString()}</Badge>;
    } else if (score > 100) {
      return <Badge className="bg-yellow-500/90 text-yellow-950 font-mono text-xs">{score.toLocaleString()}</Badge>;
    } else {
      return <Badge variant="secondary" className="font-mono text-xs">{score.toLocaleString()}</Badge>;
    }
  };

  const getRowBgClass = (ratio: number) => {
    if (ratio > 20) return 'bg-destructive/5';
    if (ratio > 10) return 'bg-yellow-500/5';
    return '';
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
    <div className="space-y-3">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <TableRow>
              <th className="h-10 px-2 text-left align-middle w-10">
                  <Checkbox
                    checked={selectedIds.size === returns.length && returns.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-14">Img</th>
                <SortableTableHeader label="Product" sortKey="asin" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableTableHeader label="Shipped" sortKey="shipped_units" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                <SortableTableHeader label="Returned" sortKey="returned_units" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                <SortableTableHeader label="Ratio" sortKey="return_ratio" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableTableHeader label="Impact" sortKey="impact_score" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableTableHeader label="Confidence" sortKey="confidence_score" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableTableHeader label="Priority" sortKey="priority_score" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <SortableTableHeader label="Date" sortKey="upload_date" currentSort={sortField} currentDirection={sortDirection} onSort={handleSort} />
                <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground w-16">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReturns.map((item, index) => (
                <TableRow key={item.id} className={`${getRowBgClass(Number(item.return_ratio))} ${index % 2 === 1 ? 'bg-muted/30' : ''}`}>
                  <TableCell className="py-2 px-2">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center overflow-hidden">
                      {getImageUrl(item.asin) ? (
                        <img
                          src={getImageUrl(item.asin)}
                          alt={item.product_title || item.asin}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                        />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 max-w-[280px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-semibold">{item.asin}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {item.product_title || '-'}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-mono text-xs font-bold">{item.asin}</p>
                          <p className="text-xs mt-1">{item.product_title || 'No title'}</p>
                          {item.file_name && (
                            <p className="text-xs text-muted-foreground mt-1">File: {item.file_name}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm">{item.shipped_units.toLocaleString()}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm">{item.returned_units.toLocaleString()}</TableCell>
                  <TableCell className="py-2">{getReturnRatioBadge(Number(item.return_ratio))}</TableCell>
                  <TableCell className="py-2">{getImpactBadge(Number(item.impact_score))}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={item.confidence_score > 70 ? 'default' : item.confidence_score > 30 ? 'secondary' : 'outline'} className="font-mono text-xs">
                      {item.confidence_score.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      className={`font-mono text-xs ${
                        item.priority_score > 85 ? 'bg-destructive text-destructive-foreground' :
                        item.priority_score > 70 ? 'bg-orange-500 text-white' :
                        item.priority_score > 50 ? 'bg-yellow-500 text-black' :
                        'bg-emerald-600 text-white'
                      }`}
                    >
                      {item.priority_score.toFixed(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">{new Date(item.upload_date).toLocaleDateString()}</TableCell>
                  <TableCell className="py-2 px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClick(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer: Row Count + Items Per Page + Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Showing {startIndex + 1}–{Math.min(endIndex, sortedReturns.length)} of {sortedReturns.length.toLocaleString()} results
        </span>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Per page:</span>
            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="0">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!showAll && totalPages > 1 && (
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
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
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
