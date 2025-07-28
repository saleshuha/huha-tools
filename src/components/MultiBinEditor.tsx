import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface MultiBinEditorProps {
  currentBinSerial: string;
  onUpdate: (newBinSerial: string, reason?: string) => Promise<void>;
  disabled?: boolean;
}

export function MultiBinEditor({ currentBinSerial, onUpdate, disabled }: MultiBinEditorProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [addBinSerial, setAddBinSerial] = useState('');
  const [removeBinSerial, setRemoveBinSerial] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentBins = currentBinSerial ? currentBinSerial.split(',').map(bin => bin.trim()) : [];

  const handleAdd = async () => {
    if (!addBinSerial.trim()) {
      toast.error('Please enter a bin/serial number');
      return;
    }

    setIsLoading(true);
    try {
      const newBins = [...currentBins, addBinSerial.trim()];
      const newBinSerial = newBins.join(', ');
      await onUpdate(newBinSerial, reason || `Added bin/serial: ${addBinSerial.trim()}`);
      setAddBinSerial('');
      setReason('');
      setIsAddDialogOpen(false);
      toast.success('Bin/Serial number added successfully');
    } catch (error) {
      console.error('Error adding bin/serial:', error);
      toast.error('Failed to add bin/serial number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removeBinSerial.trim()) {
      toast.error('Please enter a bin/serial number to remove');
      return;
    }

    const binToRemove = removeBinSerial.trim();
    if (!currentBins.includes(binToRemove)) {
      toast.error('Bin/Serial number not found');
      return;
    }

    setIsLoading(true);
    try {
      const newBins = currentBins.filter(bin => bin !== binToRemove);
      const newBinSerial = newBins.join(', ');
      await onUpdate(newBinSerial, reason || `Removed bin/serial: ${binToRemove}`);
      setRemoveBinSerial('');
      setReason('');
      setIsRemoveDialogOpen(false);
      toast.success('Bin/Serial number removed successfully');
    } catch (error) {
      console.error('Error removing bin/serial:', error);
      toast.error('Failed to remove bin/serial number');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (dialog: 'add' | 'remove') => {
    if (dialog === 'add') {
      setAddBinSerial('');
      setIsAddDialogOpen(false);
    } else {
      setRemoveBinSerial('');
      setIsRemoveDialogOpen(false);
    }
    setReason('');
  };

  if (disabled) {
    return <span className="text-muted-foreground">{currentBinSerial || 'N/A'}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm max-w-[200px] truncate" title={currentBinSerial}>
        {currentBinSerial || 'N/A'}
      </span>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 w-6 p-0">
            <Plus className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bin/Serial Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-bin-serial">New Bin/Serial Number</Label>
              <Input
                id="add-bin-serial"
                value={addBinSerial}
                onChange={(e) => setAddBinSerial(e.target.value)}
                placeholder="Enter bin/serial number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-reason">Reason (Optional)</Label>
              <Textarea
                id="add-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for adding..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleCancel('add')}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 w-6 p-0">
            <Minus className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Bin/Serial Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Bin/Serial Numbers:</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {currentBins.length > 0 ? currentBins.join(', ') : 'None'}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remove-bin-serial">Bin/Serial Number to Remove</Label>
              <Input
                id="remove-bin-serial"
                value={removeBinSerial}
                onChange={(e) => setRemoveBinSerial(e.target.value)}
                placeholder="Enter exact bin/serial number to remove"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remove-reason">Reason (Optional)</Label>
              <Textarea
                id="remove-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for removing..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleCancel('remove')}>
                Cancel
              </Button>
              <Button onClick={handleRemove} disabled={isLoading}>
                {isLoading ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}