import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Download, 
  Upload,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAsinInventory, AsinInventoryItem } from '@/hooks/useAsinInventory';
import { QuantityEditor } from './QuantityEditor';
import { StockHistoryDialog } from './StockHistoryDialog';

export function AsinInventory() {
  const { inventory, loading, addItem, updateItemStatus, bulkAdd, restockItem, updateQuantity, updateBin, refetch } = useAsinInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<AsinInventoryItem['status']>('in-stock');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { toast } = useToast();

  const updateItemBin = async (id: string, binLocation: string) => {
    if (updateBin) {
      await updateBin(id, binLocation);
    }
  };

  const handleRestock = async () => {
    if (restockQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    await restockItem(restockItemId, restockQuantity);
    setRestockDialogOpen(false);
    setRestockItemId('');
    setRestockQuantity(1);
  };

  // Form states
  const [newItem, setNewItem] = useState<{
    asin: string;
    serialNumber: string;
    status: AsinInventoryItem['status'];
    quantity: number;
  }>({
    asin: '',
    serialNumber: '',
    status: 'in-stock',
    quantity: 1
  });
  const [bulkText, setBulkText] = useState('');
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockItemId, setRestockItemId] = useState<string>('');
  const [restockQuantity, setRestockQuantity] = useState<number>(1);

  const handleAddItem = async () => {
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

    await addItem({
      asin: newItem.asin.trim(),
      serialNumber: newItem.serialNumber.trim(),
      status: newItem.status,
      dateAdded: new Date().toISOString(),
      quantity: newItem.quantity
    });

    setNewItem({ asin: '', serialNumber: '', status: 'in-stock', quantity: 1 });
    setIsAddDialogOpen(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) {
      toast({
        title: "No Data",
        description: "Please enter items to add",
        variant: "destructive"
      });
      return;
    }

    const lines = bulkText.trim().split('\n');
    const newItems: Omit<AsinInventoryItem, 'id'>[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split('\t');
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Invalid format (need ASIN and Serial Number)`);
        return;
      }

      const [asin, serialNumber, status = 'in-stock', quantity = '1'] = parts;
      
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
      const itemStatus = validStatuses.includes(status.trim()) ? status.trim() as AsinInventoryItem['status'] : 'in-stock';

      newItems.push({
        asin: asin.trim(),
        serialNumber: serialNumber.trim(),
        status: itemStatus,
        dateAdded: new Date().toISOString(),
        quantity: parseInt(quantity) || 1
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
      await bulkAdd(newItems);
      setBulkText('');
      setIsBulkDialogOpen(false);
    }
  };

  const exportInventory = () => {
    if (inventory.length === 0) {
      toast({
        title: "No Data",
        description: "No inventory items to export",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = ['Serial Number', 'ASIN', 'Status', 'Date Added', 'Date Sold', 'Quantity', 'Last Restock Date'];
    const csvData = [
      csvHeaders,
      ...inventory.map(item => [
        item.serialNumber,
        item.asin,
        item.status,
        new Date(item.dateAdded).toLocaleDateString(),
        item.dateSold ? new Date(item.dateSold).toLocaleDateString() : '',
        item.quantity.toString(),
        item.lastRestockDate ? new Date(item.lastRestockDate).toLocaleDateString() : ''
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
      link.setAttribute('download', 'asin-inventory.csv');
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
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Error",
        description: "Please select items to update",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const itemId of selectedItems) {
        await updateItemStatus(itemId, bulkStatusValue);
      }
      setSelectedItems(new Set());
      setIsBulkStatusDialogOpen(false);
      toast({
        title: "Success",
        description: `Updated ${selectedItems.size} items successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update items",
        variant: "destructive",
      });
    }
  };

  // Filter inventory based on search and status (with bulk search support)
  const filteredInventory = inventory.filter(item => {
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
    
    const matchesSearch = searchTerms.length === 0 || searchTerms.some(term =>
      item.asin.toLowerCase().includes(term) ||
      item.serialNumber.toLowerCase().includes(term)
    );
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: AsinInventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return 'text-green-600 bg-green-100';
      case 'sold': return 'text-blue-600 bg-blue-100';
      case 'reserved': return 'text-yellow-600 bg-yellow-100';
      case 'damaged': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: AsinInventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return <Package className="w-4 h-4" />;
      case 'sold': return <Check className="w-4 h-4" />;
      case 'reserved': return <Edit className="w-4 h-4" />;
      case 'damaged': return <X className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Package className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">ASIN Inventory</h1>
        </div>
        <p className="text-muted-foreground">
          Track product inventory with ASINs and serial numbers
        </p>
      </div>

      {/* Controls */}
      <Card className="glass-container p-6">
        <div className="space-y-4">
          {/* Search Bar and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search multiple items using spaces (e.g., ASIN1 SERIAL1 ASIN2)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
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
          </div>

          {/* Actions */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div></div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {selectedItems.size > 0 && (
                <Dialog open={isBulkStatusDialogOpen} onOpenChange={setIsBulkStatusDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="bg-accent/10"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Update Selected ({selectedItems.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Selected Items Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bulk-status">New Status</Label>
                        <Select
                          value={bulkStatusValue}
                          onValueChange={(value: AsinInventoryItem['status']) => setBulkStatusValue(value)}
                        >
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkStatusDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkStatusUpdate}>
                        Update {selectedItems.size} Items
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
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
                      <Label htmlFor="serial">Serial Number</Label>
                      <Input
                        id="serial"
                        value={newItem.serialNumber}
                        onChange={(e) => setNewItem(prev => ({ ...prev, serialNumber: e.target.value }))}
                        placeholder="Enter Serial Number"
                      />
                    </div>
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
                      <Label htmlFor="status">Status</Label>
                      <Select value={newItem.status} onValueChange={(value: AsinInventoryItem['status']) => 
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
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        placeholder="Enter quantity"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddItem}>Add Item</Button>
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
                        Paste tab-separated data (ASIN, Serial Number, Status, Quantity)
                      </Label>
                      <Textarea
                        id="bulk-text"
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="ASIN1	SN001	in-stock	5&#10;ASIN2	SN002	sold	1&#10;ASIN3	SN003	reserved	10"
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Format: Each line should have ASIN, Serial Number, Status (optional), and Quantity (optional) separated by tabs.
                        <br />Status: in-stock, sold, reserved, damaged (defaults to in-stock)
                        <br />Quantity: any positive number (defaults to 1)
                        <br />Example: ASIN123	SN001	in-stock	5
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkAdd}>Add Items</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={exportInventory}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={refetch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
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
                <th className="text-left p-4 font-semibold">
                  <Checkbox
                    checked={selectedItems.size === paginatedInventory.length && paginatedInventory.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems(new Set(paginatedInventory.map(item => item.id)));
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                  />
                </th>
                <th className="text-left p-4 font-semibold">Serial Number</th>
                <th className="text-left p-4 font-semibold">ASIN</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Qty</th>
                <th className="text-left p-4 font-semibold">Bin</th>
                <th className="text-center p-4 font-semibold">History</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInventory.length === 0 ? (
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
                    <td className="p-4">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedItems);
                          if (checked) {
                            newSelected.add(item.id);
                          } else {
                            newSelected.delete(item.id);
                          }
                          setSelectedItems(newSelected);
                        }}
                      />
                    </td>
                    <td className="p-4 font-mono text-sm font-semibold">{item.serialNumber}</td>
                    <td className="p-4 font-mono text-sm">{item.asin}</td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium w-32 ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="capitalize">{item.status.replace('-', ' ')}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <QuantityEditor
                        currentQuantity={item.quantity}
                        onUpdate={(newQuantity, reason) => updateQuantity(item.id, newQuantity, reason)}
                      />
                    </td>
                    <td className="p-4 text-sm">
                      <Input
                        value={item.notes || ''}
                        onChange={(e) => updateItemBin(item.id, e.target.value)}
                        placeholder="Bin location"
                        className="w-20 text-xs"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <StockHistoryDialog
                        inventoryId={item.id}
                        itemIdentifier={`${item.asin} (${item.serialNumber})`}
                        inventoryType="asin"
                      />
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
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInventory.length)} of {filteredInventory.length} items
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Restock Dialog */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="restockQuantity">New Quantity</Label>
              <Input
                id="restockQuantity"
                type="number"
                min="1"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(parseInt(e.target.value) || 1)}
                placeholder="Enter new quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestock}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Restock Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}