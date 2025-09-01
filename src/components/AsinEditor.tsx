import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Edit3, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AsinEditorProps {
  currentAsin?: string;
  onUpdate: (newAsin: string) => Promise<void>;
}

export function AsinEditor({ currentAsin = '', onUpdate }: AsinEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentAsin);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (editValue.trim() === currentAsin.trim()) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(editValue.trim());
      setIsEditing(false);
      toast({
        title: "ASIN Updated",
        description: "ASIN number has been updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating ASIN:', error);
      
      // Handle uniqueness constraint violation
      if (error.message?.includes('duplicate key value') || 
          error.message?.includes('unique constraint') ||
          error.code === '23505') {
        toast({
          title: "Duplicate ASIN",
          description: "This ASIN already exists in your inventory",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update ASIN number",
          variant: "destructive"
        });
      }
      setEditValue(currentAsin);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditValue(currentAsin);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Enter ASIN..."
          className="h-8 text-sm font-mono flex-1 min-w-0"
          disabled={isUpdating}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          autoFocus
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isUpdating}
          className="h-8 w-8 p-0 shrink-0"
        >
          <Check className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isUpdating}
          className="h-8 w-8 p-0 shrink-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group min-w-0">
      <span className="font-mono text-sm flex-1 min-w-0 truncate">
        {currentAsin || '-'}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <Edit3 className="w-3 h-3" />
      </Button>
    </div>
  );
}