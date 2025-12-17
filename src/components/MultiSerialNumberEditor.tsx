import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, Hash, Loader2, Trash2, Plus } from 'lucide-react';

interface MultiSerialNumberEditorProps {
  currentSerialNumber: string;
  additionalSerialNumbers?: string[];
  onUpdatePrimary: (newSerialNumber: string) => void;
  onDeletePrimary?: () => void;
  onAddAdditional: (serial: string) => Promise<void>;
  onRemoveAdditional: (serial: string) => Promise<void>;
  hasDuplicates?: boolean;
  onViewDuplicates?: () => void;
  getNextSerial?: () => Promise<string> | string;
}

export function MultiSerialNumberEditor({ 
  currentSerialNumber = '', 
  additionalSerialNumbers = [],
  onUpdatePrimary,
  onDeletePrimary,
  onAddAdditional,
  onRemoveAdditional,
  hasDuplicates = false,
  onViewDuplicates,
  getNextSerial
}: MultiSerialNumberEditorProps) {
  const [isEditingPrimary, setIsEditingPrimary] = useState(false);
  const [primaryValue, setPrimaryValue] = useState(currentSerialNumber);
  const [isLoadingSerial, setIsLoadingSerial] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSerialValue, setNewSerialValue] = useState('');
  const [removingSerial, setRemovingSerial] = useState<string | null>(null);

  const handleSavePrimary = () => {
    const trimmedValue = primaryValue.trim();
    if (trimmedValue && trimmedValue !== currentSerialNumber) {
      onUpdatePrimary(trimmedValue);
    }
    setIsEditingPrimary(false);
  };

  const handleCancelPrimary = () => {
    setPrimaryValue(currentSerialNumber);
    setIsEditingPrimary(false);
  };

  const handleAutoSerial = async () => {
    if (getNextSerial) {
      setIsLoadingSerial(true);
      try {
        const nextSerial = await getNextSerial();
        if (nextSerial) {
          await onUpdatePrimary(nextSerial);
        }
      } catch (error) {
        console.error('Error auto-assigning serial:', error);
      } finally {
        setIsLoadingSerial(false);
      }
    }
  };

  const handleAddNewSerial = async () => {
    const trimmed = newSerialValue.trim();
    if (!trimmed) return;
    
    setIsLoadingSerial(true);
    try {
      await onAddAdditional(trimmed);
      setNewSerialValue('');
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error adding serial:', error);
    } finally {
      setIsLoadingSerial(false);
    }
  };

  const handleAutoAddSerial = async () => {
    if (!getNextSerial) return;
    
    setIsLoadingSerial(true);
    try {
      const nextSerial = await getNextSerial();
      if (nextSerial) {
        await onAddAdditional(nextSerial);
      }
    } catch (error) {
      console.error('Error auto-adding serial:', error);
    } finally {
      setIsLoadingSerial(false);
    }
  };

  const handleRemoveAdditional = async (serial: string) => {
    setRemovingSerial(serial);
    try {
      await onRemoveAdditional(serial);
    } catch (error) {
      console.error('Error removing serial:', error);
    } finally {
      setRemovingSerial(null);
    }
  };

  // Primary serial editing mode
  if (isEditingPrimary) {
    return (
      <div className="flex items-center gap-1 min-w-[150px]">
        <Input
          value={primaryValue}
          onChange={(e) => setPrimaryValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSavePrimary();
            if (e.key === 'Escape') handleCancelPrimary();
          }}
          className="h-8 text-sm font-mono"
          placeholder="Enter Serial Number"
          autoFocus
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSavePrimary}
          className="h-8 w-8 p-0"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancelPrimary}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-[120px]">
      {/* Primary serial row */}
      <div className="flex items-center gap-1 group">
        <span
          className={`font-mono text-sm flex-1 ${hasDuplicates ? 'text-destructive font-semibold' : ''}`}
        >
          {currentSerialNumber || '-'}
        </span>

        {/* Badge showing additional count */}
        {additionalSerialNumbers.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            (+{additionalSerialNumbers.length})
          </span>
        )}

        {/* Auto-assign for empty primary */}
        {getNextSerial && !currentSerialNumber && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAutoSerial}
            disabled={isLoadingSerial}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Auto-assign serial number"
          >
            {isLoadingSerial ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Hash className="w-3 h-3" />
            )}
          </Button>
        )}

        {/* Edit primary */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditingPrimary(true)}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit serial number"
        >
          <Edit2 className="w-3 h-3" />
        </Button>

        {/* Add additional serial */}
        {currentSerialNumber && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAddingNew(true)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add additional serial number"
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}

        {/* Delete primary */}
        {currentSerialNumber && onDeletePrimary && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDeletePrimary}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            title="Delete serial number"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Additional serials list (always visible) */}
      {additionalSerialNumbers.length > 0 && (
        <div className="mt-1 pl-2 border-l-2 border-muted space-y-1">
          {additionalSerialNumbers.map((serial) => (
            <div key={serial} className="flex items-center gap-1 group/item">
              <span className="font-mono text-xs text-muted-foreground flex-1">{serial}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveAdditional(serial)}
                disabled={removingSerial === serial}
                className="h-5 w-5 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive"
                title="Remove this serial"
              >
                {removingSerial === serial ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new serial form */}
      {isAddingNew && (
        <div className="mt-2 flex items-center gap-1">
          <Input
            value={newSerialValue}
            onChange={(e) => setNewSerialValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddNewSerial();
              if (e.key === 'Escape') {
                setIsAddingNew(false);
                setNewSerialValue('');
              }
            }}
            className="h-7 text-xs font-mono"
            placeholder="New serial..."
            autoFocus
          />
          {getNextSerial && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAutoAddSerial}
              disabled={isLoadingSerial}
              className="h-7 w-7 p-0"
              title="Auto-assign"
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
            onClick={handleAddNewSerial}
            disabled={!newSerialValue.trim() || isLoadingSerial}
            className="h-7 w-7 p-0"
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAddingNew(false);
              setNewSerialValue('');
            }}
            className="h-7 w-7 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
