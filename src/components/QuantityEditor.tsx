import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Edit3, Save, X } from 'lucide-react';

interface QuantityEditorProps {
  currentQuantity: number;
  onUpdate: (newQuantity: number, reason?: string) => Promise<void>;
  disabled?: boolean;
}

export function QuantityEditor({ currentQuantity, onUpdate, disabled = false }: QuantityEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newQuantity, setNewQuantity] = useState(currentQuantity);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (newQuantity === currentQuantity) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onUpdate(newQuantity, reason || undefined);
      setIsEditing(false);
      setReason('');
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewQuantity(currentQuantity);
    setReason('');
    setIsEditing(false);
  };

  if (disabled) {
    return <span className="font-medium">{currentQuantity}</span>;
  }

  return (
    <Dialog open={isEditing} onOpenChange={setIsEditing}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1 font-medium">
          <Edit3 className="w-3 h-3 mr-1" />
          {currentQuantity}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Quantity</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="quantity">New Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Sale, Return, Damage, Restock..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}