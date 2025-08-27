import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Upload, Plus, Trash2 } from 'lucide-react';
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
  
  const itemsPerPage = 20;
  const maxTotalItems = 1000;

  useEffect(() => {
    fetchEligibleItems();
  }, [currentPage]);

  const fetchEligibleItems = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      
      // First get the count
      const { count } = await supabase
        .from('print_eligible_items')
        .select('*', { count: 'exact', head: true });
      
      // Limit total items to 1000
      const actualTotal = Math.min(count || 0, maxTotalItems);
      setTotalItems(actualTotal);
      
      // Then get the data with pagination
      const { data, error } = await supabase
        .from('print_eligible_items')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)
        .limit(Math.min(itemsPerPage, maxTotalItems - offset));

      if (error) throw error;
      setEligibleItems(data?.map(item => ({
        ...item,
        type: item.type as 'ASIN' | 'SKU'
      })) || []);
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
          type: identifierType,
          is_active: true,
          user_id: user?.id
        }]);

      if (error) throw error;

      toast.success('Item added successfully');
      setNewIdentifier('');
      setShowAddDialog(false);
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
        type: identifierType,
        is_active: true,
        user_id: user?.id
      }));

      const { error } = await supabase
        .from('print_eligible_items')
        .insert(insertData);

      if (error) throw error;

      toast.success(`Added ${items.length} items successfully`);
      setBulkIdentifiers('');
      setShowBulkDialog(false);
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
        .update({ is_active: newStatus })
        .eq('id', id);

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
        .eq('id', id);

      if (error) throw error;

      setEligibleItems(prev => prev.filter(item => item.id !== id));
      setTotalItems(prev => prev - 1);
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Print Eligible Items ({totalItems}/{maxTotalItems})
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
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {eligibleItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant={item.type === 'ASIN' ? 'default' : 'secondary'}>
                      {item.type}
                    </Badge>
                    <span className="font-mono">{item.identifier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) => toggleItemStatus(item.id, checked)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {eligibleItems.length === 0 && !loading && (
                <p className="text-muted-foreground text-center py-8">
                  No eligible items found
                </p>
              )}
              {loading && (
                <p className="text-muted-foreground text-center py-8">
                  Loading...
                </p>
              )}
            </div>
          </ScrollArea>
          
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
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
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