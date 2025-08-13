import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Warehouse, Plus, Building2, Trash2, Edit } from 'lucide-react';
import { useWarehouseManager } from '@/hooks/useWarehouseManager';

export function SimpleWarehouseManager() {
  const { 
    warehouses, 
    selectedWarehouse, 
    setSelectedWarehouse, 
    addWarehouse, 
    updateWarehouse, 
    deleteWarehouse,
    loading
  } = useWarehouseManager();

  const [isOpen, setIsOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    is_default: false
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      location: '',
      is_default: false
    });
    setEditingWarehouse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      return;
    }

    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, formData);
      } else {
        await addWarehouse(formData);
      }
      resetForm();
      setIsOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      location: warehouse.location || '',
      is_default: warehouse.is_default
    });
    setIsOpen(true);
  };

  const handleDelete = async (warehouse: any) => {
    if (warehouses.length <= 1) {
      return; // Don't delete the last warehouse
    }
    await deleteWarehouse(warehouse.id);
  };

  if (loading) {
    return <Button disabled>Managing Warehouses...</Button>;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Warehouse Selector */}
      <Select 
        value={selectedWarehouse?.id || ''} 
        onValueChange={(value) => {
          const warehouse = warehouses.find(w => w.id === value);
          setSelectedWarehouse(warehouse || null);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select warehouse" />
        </SelectTrigger>
        <SelectContent>
          {warehouses.map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{warehouse.code} - {warehouse.name}</span>
                {warehouse.is_default && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Manage Warehouses Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetForm();
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Warehouse className="w-4 h-4 mr-1" />
            Manage
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Warehouses</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Warehouses List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Warehouses</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <div>
                        <div className="font-medium text-sm">{warehouse.code} - {warehouse.name}</div>
                        {warehouse.location && (
                          <div className="text-xs text-muted-foreground">{warehouse.location}</div>
                        )}
                      </div>
                      {warehouse.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(warehouse)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {warehouses.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(warehouse)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4" />
                <Label className="text-sm font-medium">
                  {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                </Label>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="code" className="text-xs">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="WH001"
                    className="h-8"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name" className="text-xs">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Main Warehouse"
                    className="h-8"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="location" className="text-xs">Location (Optional)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Dubai, UAE"
                  className="h-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_default" className="text-xs">Set as default warehouse</Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" size="sm" className="flex-1">
                  {editingWarehouse ? 'Update' : 'Add'} Warehouse
                </Button>
                {editingWarehouse && (
                  <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
