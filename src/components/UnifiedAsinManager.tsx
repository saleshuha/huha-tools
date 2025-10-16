import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { useInventoryAsinImages } from '@/hooks/useInventoryAsinImages';
import { usePOAsinImages } from '@/hooks/usePOAsinImages';
import { Download, Image as ImageIcon, Package, AlertCircle, Loader2, Box } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UnifiedAsinItem {
  asin: string;
  title: string | null;
  quantity?: number;
  status?: string;
  hasImage: boolean;
  imageUrl?: string;
  source: 'inventory' | 'po';
}

export function UnifiedAsinManager() {
  const {
    inventoryAsinItems,
    missingAsinItems: inventoryMissing,
    coveredAsinItems: inventoryCovered,
    isLoading: inventoryLoading,
    exportMissingAsins: exportInventoryMissing
  } = useInventoryAsinImages();

  const {
    poAsinItems,
    missingAsinItems: poMissing,
    coveredAsinItems: poCovered,
    isLoading: poLoading,
    exportMissingAsins: exportPOMissing
  } = usePOAsinImages();

  const [currentPage, setCurrentPage] = useState(1);
  const [activeView, setActiveView] = useState<'missing' | 'covered'>('missing');
  const itemsPerPage = 10;
  const { toast } = useToast();
  const [inStockCount, setInStockCount] = useState(0);
  const [poAsinCount, setPoAsinCount] = useState(0);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch additional metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);
        
        // Get in-stock inventory count
        const { count: inStockTotal } = await supabase
          .from('asin_inventory')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in-stock');
        
        // Get unique PO ASINs count
        const { data: poAsins } = await supabase
          .from('po_orders')
          .select('asin')
          .not('asin', 'is', null);
        
        const uniquePoAsins = new Set(poAsins?.map(item => item.asin).filter(Boolean));
        
        setInStockCount(inStockTotal || 0);
        setPoAsinCount(uniquePoAsins.size);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Combine all ASIN items
  const allMissingItems = useMemo(() => {
    const inventoryItems: UnifiedAsinItem[] = inventoryMissing.map(item => ({
      ...item,
      source: 'inventory' as const
    }));
    
    const poItems: UnifiedAsinItem[] = poMissing.map(item => ({
      asin: item.asin,
      title: item.title || null,
      hasImage: false,
      imageUrl: undefined,
      source: 'po' as const
    }));

    // Remove duplicates by ASIN, preferring inventory items
    const asinMap = new Map<string, UnifiedAsinItem>();
    [...poItems, ...inventoryItems].forEach(item => {
      if (!asinMap.has(item.asin) || item.source === 'inventory') {
        asinMap.set(item.asin, item);
      }
    });

    return Array.from(asinMap.values()).sort((a, b) => a.asin.localeCompare(b.asin));
  }, [inventoryMissing, poMissing]);

  const allCoveredItems = useMemo(() => {
    const inventoryItems: UnifiedAsinItem[] = inventoryCovered.map(item => ({
      ...item,
      source: 'inventory' as const
    }));
    
    const poItems: UnifiedAsinItem[] = poCovered.map(item => ({
      asin: item.asin,
      title: item.title || null,
      hasImage: true,
      imageUrl: item.imageUrl,
      source: 'po' as const
    }));

    // Remove duplicates by ASIN, preferring inventory items
    const asinMap = new Map<string, UnifiedAsinItem>();
    [...poItems, ...inventoryItems].forEach(item => {
      if (!asinMap.has(item.asin) || item.source === 'inventory') {
        asinMap.set(item.asin, item);
      }
    });

    return Array.from(asinMap.values()).sort((a, b) => a.asin.localeCompare(b.asin));
  }, [inventoryCovered, poCovered]);

  const currentItems = activeView === 'missing' ? allMissingItems : allCoveredItems;
  const totalItems = currentItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Reset page when switching views
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeView]);

  // Pagination logic with ellipsis
  const getPaginatedItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return currentItems.slice(startIndex, endIndex);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('ellipsis-start');
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      pages.push(totalPages);
    }

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          {pages.map((page, index) => (
            <PaginationItem key={index}>
              {typeof page === 'string' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const handleExportMissing = () => {
    const inventoryMissingAsins = new Set(inventoryMissing.map(item => item.asin));
    const poMissingAsins = new Set(poMissing.map(item => item.asin));
    
    if (inventoryMissingAsins.size > 0) {
      exportInventoryMissing();
    } else if (poMissingAsins.size > 0) {
      exportPOMissing();
    } else {
      toast({
        title: "No Missing ASINs",
        description: "All ASINs have images assigned.",
      });
    }
  };

  if (inventoryLoading || poLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading ASIN data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ASINs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allMissingItems.length + allCoveredItems.length}</div>
            <p className="text-xs text-muted-foreground">
              From inventory & PO data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Images</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{allMissingItems.length}</div>
            <p className="text-xs text-muted-foreground">
              ASINs without product images
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images Available</CardTitle>
            <ImageIcon className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{allCoveredItems.length}</div>
            <p className="text-xs text-muted-foreground">
              ASINs with product images
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalItems > 0 ? Math.round((allCoveredItems.length / totalItems) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Image coverage ratio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-Stock Inventory</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Items currently in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PO ASINs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poAsinCount}</div>
            <p className="text-xs text-muted-foreground">
              Unique ASINs in PO orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      {allMissingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Missing ASINs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportMissing}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Missing ASINs ({allMissingItems.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data View Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ASIN Image Management</CardTitle>
            <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'missing' | 'covered')}>
              <TabsList>
                <TabsTrigger value="missing" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Missing ({allMissingItems.length})
                </TabsTrigger>
                <TabsTrigger value="covered" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  With Images ({allCoveredItems.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {currentItems.length > 0 ? (
            <>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">ASIN</th>
                      <th className="px-4 py-2 text-left">Source</th>
                      <th className="px-4 py-2 text-left">Title</th>
                      {activeView === 'missing' ? (
                        <>
                          <th className="px-4 py-2 text-left">Quantity</th>
                          <th className="px-4 py-2 text-left">Status</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-2 text-left">Preview</th>
                          <th className="px-4 py-2 text-left">Image URL</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedItems().map((item) => (
                      <tr key={`${item.source}-${item.asin}`} className="border-b">
                        <td className="px-4 py-2 font-mono text-sm">{item.asin}</td>
                        <td className="px-4 py-2">
                          <Badge variant={item.source === 'inventory' ? 'default' : 'outline'}>
                            {item.source === 'inventory' ? 'Inventory' : 'PO'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">{item.title || 'No title'}</td>
                        {activeView === 'missing' ? (
                          <>
                            <td className="px-4 py-2">{item.quantity || '-'}</td>
                            <td className="px-4 py-2">
                              {item.status ? (
                                <Badge variant="outline">{item.status}</Badge>
                              ) : (
                                <Badge variant="destructive">No Image</Badge>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2">
                              {item.imageUrl && (
                                <img 
                                  src={item.imageUrl} 
                                  alt={`Image for ${item.asin}`}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder.svg';
                                  }}
                                />
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <a 
                                href={item.imageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm truncate block max-w-[200px]"
                              >
                                {item.imageUrl}
                              </a>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No {activeView === 'missing' ? 'missing' : 'covered'} ASINs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}