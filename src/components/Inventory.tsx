import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  Check,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';

interface InventoryItem {
  id: string;
  asin: string;
  serialNumber: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged';
  dateAdded: string;
  dateSold?: string;
  notes?: string;
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { toast } = useToast();

  // Form states
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    status: InventoryItem['status'];
    notes: string;
  }>({
    asin: '',
    serialNumber: '',
    status: 'in-stock',
    notes: ''
  });
  const [bulkText, setBulkText] = useState('');

  // Load inventory from localStorage on component mount
  useEffect(() => {
    const savedInventory = localStorage.getItem('huha-inventory');
    if (savedInventory) {
      try {
        setInventory(JSON.parse(savedInventory));
      } catch (error) {
        console.error('Error loading inventory:', error);
      }
    }
  }, []);

  // Save inventory to localStorage whenever inventory changes
  useEffect(() => {
    localStorage.setItem('huha-inventory', JSON.stringify(inventory));
  }, [inventory]);

  const addItem = useCallback(() => {
    if (!newItem.asin.trim() || !newItem.serialNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "ASIN and Serial Number are required",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate serial number
    const exists = inventory.some(item => item.serialNumber === newItem.serialNumber.trim());
    if (exists) {
      toast({
        title: "Duplicate Serial Number",
        description: "This serial number already exists in inventory",
        variant: "destructive"
      });
      return;
    }

    const item: InventoryItem = {
      id: Date.now().toString(),
      asin: newItem.asin.trim(),
      serialNumber: newItem.serialNumber.trim(),
      status: newItem.status,
      dateAdded: new Date().toISOString(),
      notes: newItem.notes.trim() || undefined
    };

    setInventory(prev => [...prev, item]);
    setNewItem({ asin: '', serialNumber: '', status: 'in-stock', notes: '' });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Item Added",
      description: `Added ${item.asin} with serial ${item.serialNumber}`,
    });
  }, [newItem, inventory, toast]);

  const bulkAdd = useCallback(() => {
    if (!bulkText.trim()) {
      toast({
        title: "No Data",
        description: "Please enter items to add",
        variant: "destructive"
      });
      return;
    }

    const lines = bulkText.trim().split('\n');
    const newItems: InventoryItem[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split('\t');
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Invalid format (need ASIN and Serial Number)`);
        return;
      }

      const [asin, serialNumber, status = 'in-stock', notes = ''] = parts;
      
      if (!asin.trim() || !serialNumber.trim()) {
        errors.push(`Line ${index + 1}: ASIN and Serial Number cannot be empty`);
        return;
      }

      // Check for duplicate serial number
      const exists = inventory.some(item => item.serialNumber === serialNumber.trim()) ||
                    newItems.some(item => item.serialNumber === serialNumber.trim());
      if (exists) {
        errors.push(`Line ${index + 1}: Duplicate serial number ${serialNumber}`);
        return;
      }

      const validStatuses = ['in-stock', 'sold', 'reserved', 'damaged'];
      const itemStatus = validStatuses.includes(status.trim()) ? status.trim() as InventoryItem['status'] : 'in-stock';

      newItems.push({
        id: `${Date.now()}-${index}`,
        asin: asin.trim(),
        serialNumber: serialNumber.trim(),
        status: itemStatus,
        dateAdded: new Date().toISOString(),
        notes: notes.trim() || undefined
      });
    });

    if (errors.length > 0) {
      toast({
        title: "Bulk Add Errors",
        description: `${errors.length} errors found. Check console for details.`,
        variant: "destructive"
      });
      console.error('Bulk add errors:', errors);
    }

    if (newItems.length > 0) {
      setInventory(prev => [...prev, ...newItems]);
      setBulkText('');
      setIsBulkDialogOpen(false);
      
      toast({
        title: "Bulk Add Complete",
        description: `Added ${newItems.length} items to inventory`,
      });
    }
  }, [bulkText, inventory, toast]);

  const updateItemStatus = useCallback((id: string, status: InventoryItem['status']) => {
    setInventory(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            status,
            dateSold: status === 'sold' ? new Date().toISOString() : item.dateSold
          }
        : item
    ));
    
    toast({
      title: "Status Updated",
      description: `Item status changed to ${status}`,
    });
  }, [toast]);

  const deleteItem = useCallback((id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Item Deleted",
      description: "Item removed from inventory",
    });
  }, [toast]);

  const exportInventory = useCallback(() => {
    if (inventory.length === 0) {
      toast({
        title: "No Data",
        description: "No inventory items to export",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = ['ASIN', 'Serial Number', 'Status', 'Date Added', 'Date Sold', 'Notes'];
    const csvData = [
      csvHeaders,
      ...inventory.map(item => [
        item.asin,
        item.serialNumber,
        item.status,
        new Date(item.dateAdded).toLocaleDateString(),
        item.dateSold ? new Date(item.dateSold).toLocaleDateString() : '',
        item.notes || ''
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'inventory.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `Exported ${inventory.length} items to CSV`,
    });
  }, [inventory, toast]);

  // Filter inventory based on search and status
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return 'text-green-600 bg-green-100';
      case 'sold': return 'text-blue-600 bg-blue-100';
      case 'reserved': return 'text-yellow-600 bg-yellow-100';
      case 'damaged': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return <Package className="w-4 h-4" />;
      case 'sold': return <Check className="w-4 h-4" />;
      case 'reserved': return <Edit className="w-4 h-4" />;
      case 'damaged': return <X className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Instock Inventory</h1>
          </div>
          <p className="text-muted-foreground">
            Track product inventory with ASINs and serial numbers
          </p>
        </div>

        {/* Controls */}
        <Card className="glass-container p-6">
          <div className="space-y-4">
            {/* Search Bar - Full Width */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search ASIN, Serial Number, or Notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="in-stock">In Stock Only</SelectItem>
                    <SelectItem value="sold">Sold Only</SelectItem>
                    <SelectItem value="reserved">Reserved Only</SelectItem>
                    <SelectItem value="damaged">Damaged Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 items</SelectItem>
                    <SelectItem value="100">100 items</SelectItem>
                    <SelectItem value="150">150 items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="asin">ASIN</Label>
                      <Input
                        id="asin"
                        value={newItem.asin}
                        onChange={(e) => setNewItem(prev => ({ ...prev, asin: e.target.value }))}
                        placeholder="Enter ASIN"
                      />
                    </div>
                    <div>
                      <Label htmlFor="serial">Serial Number</Label>
                      <Input
                        id="serial"
                        value={newItem.serialNumber}
                        onChange={(e) => setNewItem(prev => ({ ...prev, serialNumber: e.target.value }))}
                        placeholder="Enter Serial Number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={newItem.status} onValueChange={(value: InventoryItem['status']) => 
                        setNewItem(prev => ({ ...prev, status: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-stock">In Stock</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={newItem.notes}
                        onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addItem}>Add Item</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Add Items</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-text">
                        Paste tab-separated data (ASIN, Serial Number, Status, Notes)
                      </Label>
                      <Textarea
                        id="bulk-text"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="ASIN1	SN001	in-stock	Notes here&#10;ASIN2	SN002	sold	More notes"
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Format: Each line should have ASIN, Serial Number, Status (optional), and Notes (optional) separated by tabs.
                        Status can be: in-stock, sold, reserved, damaged (defaults to in-stock)
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={bulkAdd}>Add Items</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={exportInventory}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{inventory.length}</div>
            <div className="text-sm text-muted-foreground">Total Items</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {inventory.filter(item => item.status === 'in-stock').length}
            </div>
            <div className="text-sm text-muted-foreground">In Stock</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {inventory.filter(item => item.status === 'sold').length}
            </div>
            <div className="text-sm text-muted-foreground">Sold</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {inventory.filter(item => item.status === 'reserved').length}
            </div>
            <div className="text-sm text-muted-foreground">Reserved</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {inventory.filter(item => item.status === 'damaged').length}
            </div>
            <div className="text-sm text-muted-foreground">Damaged</div>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card className="glass-container">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-4 font-semibold">ASIN</th>
                  <th className="text-left p-4 font-semibold">Serial Number</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Date Added</th>
                  <th className="text-left p-4 font-semibold">Notes</th>
                  <th className="text-center p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      {inventory.length === 0 
                        ? "No inventory items yet. Add your first item to get started!"
                        : "No items match your search criteria."
                      }
                    </td>
                  </tr>
                ) : (
                  paginatedInventory.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-4 font-mono text-sm">{item.asin}</td>
                      <td className="p-4 font-mono text-sm">{item.serialNumber}</td>
                      <td className="p-4">
                        <Select 
                          value={item.status} 
                          onValueChange={(value: InventoryItem['status']) => updateItemStatus(item.id, value)}
                        >
                          <SelectTrigger className={`w-32 ${getStatusColor(item.status)}`}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-stock">In Stock</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 text-sm">
                        {new Date(item.dateAdded).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm max-w-48 truncate" title={item.notes}>
                        {item.notes || '-'}
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length} items
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}