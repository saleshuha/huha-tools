import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, Hash } from 'lucide-react';

interface SerialNumberEditorProps {
  currentSerialNumber?: string;
  onUpdate: (newSerialNumber: string) => void;
  getNextSerial?: () => string;
}

export function SerialNumberEditor({ currentSerialNumber = '', onUpdate, getNextSerial }: SerialNumberEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [serialValue, setSerialValue] = useState(currentSerialNumber);

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

  const handleAutoSerial = () => {
    if (getNextSerial) {
      const nextSerial = getNextSerial();
      onUpdate(nextSerial);
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
    <div className="flex items-center gap-2 group min-w-[100px]">
      <span className="font-mono text-sm flex-1">
        {currentSerialNumber || '-'}
      </span>
      {getNextSerial && !currentSerialNumber && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAutoSerial}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Auto-assign next serial number"
        >
          <Hash className="w-3 h-3" />
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="w-3 h-3" />
      </Button>
    </div>
  );
}