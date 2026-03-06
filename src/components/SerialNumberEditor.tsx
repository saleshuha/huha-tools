import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, Hash, Loader2, Trash2, AlertCircle } from 'lucide-react';

interface SerialNumberEditorProps {
  currentSerialNumber?: string;
  onUpdate: (newSerialNumber: string) => void;
  onDelete?: () => void;
  onViewDuplicates?: () => void;
  hasDuplicates?: boolean;
  getNextSerial?: () => Promise<string> | string; // Allow async
  itemTitle?: string;
}

export function SerialNumberEditor({ 
  currentSerialNumber = '', 
  onUpdate, 
  onDelete,
  onViewDuplicates,
  hasDuplicates = false,
  getNextSerial 
}: SerialNumberEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [serialValue, setSerialValue] = useState(currentSerialNumber);
  const [isLoadingSerial, setIsLoadingSerial] = useState(false);

  const handleSave = () => {
    const trimmedValue = serialValue.trim();
    if (trimmedValue && trimmedValue !== currentSerialNumber) {
      onUpdate(trimmedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSerialValue(currentSerialNumber);
    setIsEditing(false);
  };

  const handleAutoSerial = async () => {
    if (getNextSerial) {
      setIsLoadingSerial(true);
      try {
        const nextSerial = await getNextSerial();
        if (nextSerial) {
          await onUpdate(nextSerial);
        }
      } catch (error) {
        console.error('Error auto-assigning serial:', error);
        // Error toast is already shown by getNextSerial or onUpdate
      } finally {
        setIsLoadingSerial(false);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[150px]">
        <Input
          value={serialValue}
          onChange={(e) => setSerialValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="h-8 text-sm font-mono"
          placeholder="Enter Serial Number"
          autoFocus
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          className="h-8 w-8 p-0"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group min-w-[100px]">
      <span className={`font-mono text-sm flex-1 ${hasDuplicates ? 'text-destructive font-semibold' : ''}`}>
        {currentSerialNumber || '-'}
      </span>
      {hasDuplicates && onViewDuplicates && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onViewDuplicates}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive opacity-100"
          title="View duplicate serial numbers"
        >
          <AlertCircle className="w-4 h-4" />
        </Button>
      )}
      {getNextSerial && !currentSerialNumber && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAutoSerial}
          disabled={isLoadingSerial}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Auto-assign next serial number"
        >
          {isLoadingSerial ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Hash className="w-3 h-3" />
          )}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit serial number"
      >
        <Edit2 className="w-3 h-3" />
      </Button>
      {currentSerialNumber && onDelete && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          title="Delete serial number"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}