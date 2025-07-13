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
  X,
  Hash
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';

interface SSInventoryItem {
  id: string;
  skuNumber: string;
  location: string;
  status: 'in-stock' | 'sold' | 'reserved' | 'damaged';
  dateAdded: string;
}

export function SSInventory() {
  const [inventory, setInventory] = useState<SSInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SSInventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { toast } = useToast();

  // Form states
  const [newItem, setNewItem] = useState<{
    skuNumber: string;
    location: string;
    status: SSInventoryItem['status'];
  }>({
    skuNumber: '',
    location: '',
    status: 'in-stock'
  });
  const [bulkText, setBulkText] = useState('');

  // Load inventory from localStorage on component mount
  useEffect(() => {
    const savedInventory = localStorage.getItem('huha-ss-inventory');
    if (savedInventory) {
      try {
        setInventory(JSON.parse(savedInventory));
      } catch (error) {
        console.error('Error loading SS inventory:', error);
      }
    }
  }, []);

  // Save inventory to localStorage whenever inventory changes
  useEffect(() => {
    localStorage.setItem('huha-ss-inventory', JSON.stringify(inventory));
  }, [inventory]);

  const addItem = useCallback(() => {
    if (!newItem.skuNumber.trim() || !newItem.location.trim()) {
      toast({
        title: "Validation Error",
        description: "SKU Number and Location are required",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate SKU number
    const exists = inventory.some(item => item.skuNumber === newItem.skuNumber.trim());
    if (exists) {
      toast({
        title: "Duplicate SKU Number",
        description: "This SKU number already exists in inventory",
        variant: "destructive"
      });
      return;
    }

    const item: SSInventoryItem = {
      id: Date.now().toString(),
      skuNumber: newItem.skuNumber.trim(),
      location: newItem.location.trim(),
      status: newItem.status,
      dateAdded: new Date().toISOString()
    };

    setInventory(prev => [...prev, item]);
    setNewItem({ skuNumber: '', location: '', status: 'in-stock' });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Item Added",
      description: `Added SKU ${item.skuNumber} to location ${item.location}`,
    });
  }, [newItem, inventory, toast]);

  const updateItemStatus = useCallback((id: string, status: SSInventoryItem['status']) => {
    setInventory(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status }
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

    const csvHeaders = ['SKU Number', 'Location', 'Status', 'Date Added'];
    const csvData = [
      csvHeaders,
      ...inventory.map(item => [
        item.skuNumber,
        item.location,
        item.status,
        new Date(item.dateAdded).toLocaleDateString()
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
      link.setAttribute('download', 'sku-inventory.csv');
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
      item.skuNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const getStatusColor = (status: SSInventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return 'text-green-600 bg-green-100';
      case 'sold': return 'text-blue-600 bg-blue-100';
      case 'reserved': return 'text-yellow-600 bg-yellow-100';
      case 'damaged': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: SSInventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return <Package className="w-4 h-4" />;
      case 'sold': return <Check className="w-4 h-4" />;
      case 'reserved': return <Edit className="w-4 h-4" />;
      case 'damaged': return <X className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">{/* Removed duplicate background/padding since parent handles it */}
      <div className="space-y-6">{/* Removed max-width constraint since parent handles it */}
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Hash className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">SKU Inventory</h1>
          </div>
          <p className="text-muted-foreground">
            Track SKU inventory with locations and status
          </p>
        </div>

        {/* Controls */}
        <Card className="glass-container p-6">
          <div className="space-y-4">
            {/* Search Bar - Full Width */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search SKU Number or Location..."
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
                      <DialogTitle>Add New SKU Inventory Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="skuNumber">SKU Number</Label>
                        <Input
                          id="skuNumber"
                          value={newItem.skuNumber}
                          onChange={(e) => setNewItem(prev => ({ ...prev, skuNumber: e.target.value }))}
                          placeholder="Enter SKU Number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={newItem.location}
                          onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Enter Storage Location"
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={newItem.status} onValueChange={(value: SSInventoryItem['status']) => 
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
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addItem}>Add Item</Button>
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
                  <th className="text-left p-4 font-semibold">SKU Number</th>
                  <th className="text-left p-4 font-semibold">Location</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Date Added</th>
                  <th className="text-center p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      {inventory.length === 0 
                        ? "No SKU inventory items yet. Add your first item to get started!"
                        : "No items match your search criteria."
                      }
                    </td>
                  </tr>
                ) : (
                  paginatedInventory.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-4 font-mono text-sm font-semibold">{item.skuNumber}</td>
                      <td className="p-4 text-sm">{item.location}</td>
                      <td className="p-4">
                        <Select 
                          value={item.status} 
                          onValueChange={(value: SSInventoryItem['status']) => updateItemStatus(item.id, value)}
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
                      <td className="p-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-700"
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