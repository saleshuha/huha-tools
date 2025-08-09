import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AddSKUDialogProps {
  onAddSKUs?: (skus: any[]) => Promise<void>;
  isLoading?: boolean;
}

export function AddSKUDialog({ onAddSKUs, isLoading }: AddSKUDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    sku_code: '',
    title: '',
    description: '',
    cost: '',
    weight: '',
    notes: ''
  });

  const handleNavigateToAddSKU = () => {
    navigate('/add-sku');
  };

  const handleSingleSKUSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku_code.trim()) {
      toast({
        title: "Error",
        description: "SKU code is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const skuData = {
        sku_code: formData.sku_code.trim(),
        title: formData.title.trim() || null,
        description: formData.description.trim() || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        notes: formData.notes.trim() || null
      };

      if (onAddSKUs) {
        await onAddSKUs([skuData]);
        setIsOpen(false);
        setFormData({
          sku_code: '',
          title: '',
          description: '',
          cost: '',
          weight: '',
          notes: ''
        });
        toast({
          title: "Success",
          description: "SKU added successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add SKU",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleNavigateToAddSKU} variant="secondary">
        <Upload className="h-4 w-4 mr-2" />
        Bulk uploads
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Single SKU
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Single SKU</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSingleSKUSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sku_code">SKU Code *</Label>
              <Input
                id="sku_code"
                value={formData.sku_code}
                onChange={(e) => setFormData(prev => ({ ...prev, sku_code: e.target.value }))}
                placeholder="Enter SKU code"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter product title"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add SKU'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}