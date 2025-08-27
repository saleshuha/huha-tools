import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Upload, Plus, Trash2, Eye, Printer, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLabelDoc } from '@/contexts/SimpleLabelDocContext';

interface EligibleItem {
  id: string;
  identifier: string;
  type: 'ASIN' | 'SKU';
  is_active: boolean;
  created_at: string;
}

interface OrderToProcess {
  id: string;
  file_name: string;
  asin_code?: string;
  sku_code?: string;
  product_title?: string;
  quantity: number;
  order_number?: string;
  order_date: string;
  status: string;
  has_match: boolean;
}

export const PrintEligibleItems: React.FC = () => {
  const { document: labelDoc, dataset, loadDataset } = useLabelDoc();
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderToProcess[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIdentifier, setNewIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'ASIN' | 'SKU'>('ASIN');
  const [bulkIdentifiers, setBulkIdentifiers] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  useEffect(() => {
    fetchEligibleItems();
  }, []);

  useEffect(() => {
    if (eligibleItems.length > 0) {
      fetchFilteredOrders();
    }
  }, [eligibleItems]);

  const fetchEligibleItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('print_eligible_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEligibleItems(data || []);
    } catch (error) {
      console.error('Error fetching eligible items:', error);
      toast.error('Failed to fetch eligible items');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredOrders = async () => {
    try {
      setLoading(true);
      const activeItems = eligibleItems.filter(item => item.is_active);
      
      if (activeItems.length === 0) {
        setFilteredOrders([]);
        return;
      }

      const asinList = activeItems.filter(item => item.type === 'ASIN').map(item => item.identifier);
      const skuList = activeItems.filter(item => item.type === 'SKU').map(item => item.identifier);

      let query = supabase
        .from('order_imports')
        .select('id, order_id, asin, sku, item_title, item_quantity, source_file, order_status, order_place_date');

      // Build the filter conditions
      const conditions = [];
      if (asinList.length > 0) {
        conditions.push(`asin.in.(${asinList.join(',')})`);
      }
      if (skuList.length > 0) {
        conditions.push(`sku.in.(${skuList.join(',')})`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedData: OrderToProcess[] = (data || []).map(order => ({
        id: order.id,
        file_name: order.source_file || '',
        asin_code: order.asin,
        sku_code: order.sku,
        product_title: order.item_title,
        quantity: order.item_quantity || 1,
        order_number: order.order_id,
        order_date: order.order_place_date || new Date().toISOString(),
        status: order.order_status || 'pending',
        has_match: true
      }));

      setFilteredOrders(transformedData);
    } catch (error) {
      console.error('Error fetching filtered orders:', error);
      toast.error('Failed to fetch orders');
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
      const { error } = await supabase
        .from('print_eligible_items')
        .insert([{
          identifier: newIdentifier.trim().toUpperCase(),
          type: identifierType,
          is_active: true
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
      const insertData = items.map(identifier => ({
        identifier,
        type: identifierType,
        is_active: true
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
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Eligible Items Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Print Eligible Items ({eligibleItems.length})</CardTitle>
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
          <ScrollArea className="h-32">
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
              {eligibleItems.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No eligible items added yet
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Filtered Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Matching Orders ({filteredOrders.length})
            {selectedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedOrders.length} selected
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {filteredOrders.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={handleSelectAll}>
                  {selectedOrders.length === filteredOrders.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button size="sm" disabled={selectedOrders.length === 0}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm" disabled={selectedOrders.length === 0}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={() => handleOrderSelection(order.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{order.order_number}</Badge>
                        {order.asin_code && (
                          <Badge variant="secondary">ASIN: {order.asin_code}</Badge>
                        )}
                        {order.sku_code && (
                          <Badge variant="default">SKU: {order.sku_code}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {order.product_title}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>Qty: {order.quantity}</span>
                        <span>{new Date(order.order_date).toLocaleDateString()}</span>
                        <span>Status: {order.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && eligibleItems.some(item => item.is_active) && (
                <p className="text-muted-foreground text-center py-8">
                  No orders match the active eligible items
                </p>
              )}
              {eligibleItems.filter(item => item.is_active).length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No active eligible items. Add some items and activate them to see matching orders.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};