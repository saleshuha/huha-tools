import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Warehouse, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
}

interface WarehouseManagerProps {
  warehouses: WarehouseItem[];
  onWarehouseAdd: (warehouse: Omit<WarehouseItem, 'id'>) => void;
  onWarehouseUpdate: (id: string, warehouse: Omit<WarehouseItem, 'id'>) => void;
  onWarehouseDelete: (id: string) => void;
  selectedWarehouse?: WarehouseItem;
  onWarehouseSelect: (warehouse: WarehouseItem) => void;
}

export function WarehouseManager({
  warehouses,
  onWarehouseAdd,
  onWarehouseUpdate,
  onWarehouseDelete,
  selectedWarehouse,
  onWarehouseSelect
}: WarehouseManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [warehouseCode, setWarehouseCode] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!warehouseCode.trim() || !warehouseName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both warehouse code and name",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate codes
    const isDuplicate = warehouses.some(w => 
      w.code.toLowerCase() === warehouseCode.toLowerCase() && 
      (!editingWarehouse || w.id !== editingWarehouse.id)
    );

    if (isDuplicate) {
      toast({
        title: "Error",
        description: "Warehouse code already exists",
        variant: "destructive"
      });
      return;
    }

    const warehouseData = {
      code: warehouseCode.trim(),
      name: warehouseName.trim()
    };

    if (editingWarehouse) {
      onWarehouseUpdate(editingWarehouse.id, warehouseData);
      toast({
        title: "Success",
        description: "Warehouse updated successfully"
      });
    } else {
      onWarehouseAdd(warehouseData);
      toast({
        title: "Success",
        description: "Warehouse added successfully"
      });
    }

    setWarehouseCode('');
    setWarehouseName('');
    setEditingWarehouse(null);
    setIsDialogOpen(false);
  };

  const startEdit = (warehouse: WarehouseItem) => {
    setEditingWarehouse(warehouse);
    setWarehouseCode(warehouse.code);
    setWarehouseName(warehouse.name);
    setIsDialogOpen(true);
  };

  const handleDelete = (warehouse: WarehouseItem) => {
    if (window.confirm(`Are you sure you want to delete warehouse "${warehouse.name}"?`)) {
      onWarehouseDelete(warehouse.id);
      toast({
        title: "Success",
        description: "Warehouse deleted successfully"
      });
    }
  };

  const openAddDialog = () => {
    setEditingWarehouse(null);
    setWarehouseCode('');
    setWarehouseName('');
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Warehouse className="w-5 h-5" />
          Warehouse Management
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="warehouseCode">Warehouse Code</Label>
                <Input
                  id="warehouseCode"
                  value={warehouseCode}
                  onChange={(e) => setWarehouseCode(e.target.value)}
                  placeholder="e.g., WH001"
                />
              </div>
              <div>
                <Label htmlFor="warehouseName">Warehouse Name</Label>
                <Input
                  id="warehouseName"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  placeholder="e.g., Dubai Main Warehouse"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingWarehouse ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {warehouses.length > 0 && (
        <div className="space-y-2">
          <Label>Select Active Warehouse:</Label>
          <div className="grid gap-2">
            {warehouses.map((warehouse) => (
              <Card 
                key={warehouse.id} 
                className={`cursor-pointer transition-colors ${
                  selectedWarehouse?.id === warehouse.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground/20'
                }`}
                onClick={() => onWarehouseSelect(warehouse)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{warehouse.code}</div>
                      <div className="text-sm text-muted-foreground">{warehouse.name}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(warehouse);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(warehouse);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {warehouses.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Warehouse className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No warehouses configured yet</p>
            <p className="text-sm">Add a warehouse to enable proper inventory tracking</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}