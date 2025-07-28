import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Minus, Plus, Save, X } from 'lucide-react';

interface DualQuantityEditorProps {
  currentQuantity: number;
  onUpdate: (newQuantity: number, reason?: string) => Promise<void>;
  disabled?: boolean;
}

export function DualQuantityEditor({ currentQuantity, onUpdate, disabled = false }: DualQuantityEditorProps) {
  const [isReduceOpen, setIsReduceOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [reduceQuantity, setReduceQuantity] = useState(1);
  const [addQuantity, setAddQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReduce = async () => {
    const newQuantity = Math.max(0, currentQuantity - reduceQuantity);
    setLoading(true);
    try {
      await onUpdate(newQuantity, reason || 'Stock reduced');
      setIsReduceOpen(false);
      setReduceQuantity(1);
      setReason('');
    } catch (error) {
      console.error('Error reducing quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const newQuantity = currentQuantity + addQuantity;
    setLoading(true);
    try {
      await onUpdate(newQuantity, reason || 'Stock added');
      setIsAddOpen(false);
      setAddQuantity(1);
      setReason('');
    } catch (error) {
      console.error('Error adding quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (type: 'reduce' | 'add') => {
    setReason('');
    if (type === 'reduce') {
      setReduceQuantity(1);
      setIsReduceOpen(false);
    } else {
      setAddQuantity(1);
      setIsAddOpen(false);
    }
  };

  if (disabled) {
    return <span className="font-medium">{currentQuantity}</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-medium">{currentQuantity}</span>
      
      <Separator orientation="vertical" className="h-8" />
      
      <div className="flex items-center gap-3">
        {/* Add Stock Section */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Add Stock</span>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-8 p-0">
                <Plus className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Stock</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-quantity">Quantity to Add</Label>
                  <Input
                    id="add-quantity"
                    type="number"
                    min="1"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    New quantity will be: {currentQuantity + addQuantity}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="add-reason">Reason (optional)</Label>
                  <Textarea
                    id="add-reason"
                    placeholder="e.g., Restock, Return, Purchase..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleCancel('add')} disabled={loading}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Adding...' : 'Add Stock'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Reduce Stock Section */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Reduce Stock</span>
          <Dialog open={isReduceOpen} onOpenChange={setIsReduceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-8 p-0" disabled={currentQuantity === 0}>
                <Minus className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reduce Stock</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reduce-quantity">Quantity to Reduce</Label>
                  <Input
                    id="reduce-quantity"
                    type="number"
                    min="1"
                    max={currentQuantity}
                    value={reduceQuantity}
                    onChange={(e) => setReduceQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    New quantity will be: {Math.max(0, currentQuantity - reduceQuantity)}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="reduce-reason">Reason (optional)</Label>
                  <Textarea
                    id="reduce-reason"
                    placeholder="e.g., Sale, Damage, Lost..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleCancel('reduce')} disabled={loading}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleReduce} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Reducing...' : 'Reduce Stock'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}