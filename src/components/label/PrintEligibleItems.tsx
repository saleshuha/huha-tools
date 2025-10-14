import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Upload, Plus, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EligibleItem {
  id: string;
  identifier: string;
  type: 'ASIN' | 'SKU';
  is_active: boolean;
  created_at: string;
}

export const PrintEligibleItems: React.FC = () => {
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'ASIN' | 'SKU'>('ASIN');
  const [bulkIdentifiers, setBulkIdentifiers] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const itemsPerPage = 20;

  useEffect(() => {
    fetchEligibleItems();
  }, [currentPage, searchQuery]);

  const fetchEligibleItems = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      
      // Build query with search filtering
      let query = supabase
        .from('print_eligible_items')
        .select('*')
        .order('created_at', { ascending: false });

      // Add search filter if query exists
      if (searchQuery.trim()) {
        query = query.ilike('identifier', `%${searchQuery.trim()}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + itemsPerPage - 1);

      const { data, error } = await query;

      if (error) throw error;
      
      const items = (data as any)?.map((item: any) => ({
        ...item,
        type: item.type as 'ASIN' | 'SKU'
      })) || [];
      
      setEligibleItems(items);
      
      // Get count for search results
      let countQuery = supabase
        .from('print_eligible_items')
        .select('*', { count: 'exact', head: true });

      if (searchQuery.trim()) {
        countQuery = countQuery.ilike('identifier', `%${searchQuery.trim()}%`);
      }

      const { count } = await countQuery;
      setTotalItems(count || 0);
      
    } catch (error) {
      console.error('Error fetching eligible items:', error);
      toast.error('Failed to fetch eligible items');
    } finally {
      setLoading(false);
    }
  };

  const addEligibleItem = async () => {
    if (!newIdentifier.trim()) {
      toast.error('Please enter an identifier');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('print_eligible_items')
        .insert([{
          identifier: newIdentifier.trim().toUpperCase(),
          type: identifierType.toLowerCase(),
          is_active: true,
          user_id: user?.id
        } as any]);

      if (error) throw error;

      toast.success('Item added successfully');
      setNewIdentifier('');
      setShowAddDialog(false);
      setCurrentPage(1); // Reset to first page to see new item
      fetchEligibleItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const addBulkItems = async () => {
    const items = bulkIdentifiers
      .split('\n')
      .map(line => line.trim().toUpperCase())
      .filter(line => line.length > 0);

    if (items.length === 0) {
      toast.error('Please enter at least one identifier');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = items.map(identifier => ({
        identifier,
        type: identifierType.toLowerCase(),
        is_active: true,
        user_id: user?.id
      }));

      const { error } = await supabase
        .from('print_eligible_items')
        .insert(insertData as any);

      if (error) throw error;

      toast.success(`Added ${items.length} items successfully`);
      setBulkIdentifiers('');
      setShowBulkDialog(false);
      setCurrentPage(1); // Reset to first page to see new items
      fetchEligibleItems();
    } catch (error) {
      console.error('Error adding bulk items:', error);
      toast.error('Failed to add bulk items');
    }
  };

  const toggleItemStatus = async (id: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('print_eligible_items')
        .update({ is_active: newStatus } as any)
        .eq('id' as any, id as any);

      if (error) throw error;

      setEligibleItems(prev => prev.map(item => 
        item.id === id ? { ...item, is_active: newStatus } : item
      ));
      
      toast.success(`Item ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('print_eligible_items')
        .delete()
        .eq('id' as any, id as any);

      if (error) throw error;

      // Remove item from current list
      setEligibleItems(prev => prev.filter(item => item.id !== id));
      
      // If on first page, refresh the count, otherwise just decrement
      if (currentPage === 1) {
        // Refresh count from database
        const { count } = await supabase
          .from('print_eligible_items')
          .select('*', { count: 'exact', head: true });
        
        setTotalItems(count || 0);
      } else {
        setTotalItems(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const activateAllItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('print_eligible_items')
        .update({ is_active: true } as any)
        .eq('user_id' as any, user?.id as any)
        .eq('is_active' as any, false as any);

      if (error) throw error;

      // Refresh the current page data
      await fetchEligibleItems();
      toast.success('All items activated successfully');
    } catch (error) {
      console.error('Error activating all items:', error);
      toast.error('Failed to activate all items');
    } finally {
      setLoading(false);
    }
  };

  const deactivateAllItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('print_eligible_items')
        .update({ is_active: false } as any)
        .eq('user_id' as any, user?.id as any)
        .eq('is_active' as any, true as any);

      if (error) throw error;

      // Refresh the current page data
      await fetchEligibleItems();
      toast.success('All items deactivated successfully');
    } catch (error) {
      console.error('Error deactivating all items:', error);
      toast.error('Failed to deactivate all items');
    } finally {
      setLoading(false);
    }
  };


  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Print Eligible Items ({totalItems})
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Eligible Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Type</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="type"
                          checked={identifierType === 'ASIN'}
                          onChange={() => setIdentifierType('ASIN')}
                          className="mr-2"
                        />
                        ASIN
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="type"
                          checked={identifierType === 'SKU'}
                          onChange={() => setIdentifierType('SKU')}
                          className="mr-2"
                        />
                        SKU
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>{identifierType}</Label>
                    <Input
                      value={newIdentifier}
                      onChange={(e) => setNewIdentifier(e.target.value)}
                      placeholder={`Enter ${identifierType}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addEligibleItem}>Add Item</Button>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Add Items</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Type</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bulkType"
                          checked={identifierType === 'ASIN'}
                          onChange={() => setIdentifierType('ASIN')}
                          className="mr-2"
                        />
                        ASIN
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="bulkType"
                          checked={identifierType === 'SKU'}
                          onChange={() => setIdentifierType('SKU')}
                          className="mr-2"
                        />
                        SKU
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>{identifierType} List (one per line)</Label>
                    <Textarea
                      value={bulkIdentifiers}
                      onChange={(e) => setBulkIdentifiers(e.target.value)}
                      placeholder={`Enter ${identifierType}s, one per line`}
                      rows={8}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addBulkItems}>Add Items</Button>
                    <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by SKU or ASIN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center text-sm font-medium text-muted-foreground mr-4">
              Bulk Actions:
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={activateAllItems}
              disabled={loading}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Activate All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={deactivateAllItems}
              disabled={loading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deactivate All
            </Button>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eligibleItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.type === 'ASIN' ? 'default' : 'secondary'}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{item.identifier}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(checked) => toggleItemStatus(item.id, checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {eligibleItems.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No eligible items found
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust start if we're near the end
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    // Add first page and ellipsis if needed
                    if (startPage > 1) {
                      pages.push(
                        <PaginationItem key={1}>
                          <PaginationLink
                            onClick={() => setCurrentPage(1)}
                            isActive={currentPage === 1}
                            className="cursor-pointer"
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                      );
                      
                      if (startPage > 2) {
                        pages.push(
                          <PaginationItem key="ellipsis-start">
                            <span className="px-4 py-2">...</span>
                          </PaginationItem>
                        );
                      }
                    }

                    // Add pages in range
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setCurrentPage(i)}
                            isActive={currentPage === i}
                            className="cursor-pointer"
                          >
                            {i}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }

                    // Add ellipsis and last page if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <PaginationItem key="ellipsis-end">
                            <span className="px-4 py-2">...</span>
                          </PaginationItem>
                        );
                      }
                      
                      pages.push(
                        <PaginationItem key={totalPages}>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
                            isActive={currentPage === totalPages}
                            className="cursor-pointer"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }

                    return pages;
                  })()}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              
              <p className="text-sm text-muted-foreground text-center mt-2">
                Page {currentPage} of {totalPages} - Showing {eligibleItems.length} of {totalItems} items
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};