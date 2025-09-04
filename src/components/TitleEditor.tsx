import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2 } from 'lucide-react';

interface TitleEditorProps {
  currentTitle?: string;
  onUpdate: (newTitle: string) => void;
}

export function TitleEditor({ currentTitle = '', onUpdate }: TitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(currentTitle);

  const handleSave = () => {
    onUpdate(titleValue.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitleValue(currentTitle);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[200px]">
        <Input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="h-8 text-sm"
          placeholder="Enter product title"
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
    <div className="flex items-center gap-2 group min-w-[150px]">
      <span className="text-sm flex-1 truncate" title={currentTitle}>
        {currentTitle || '-'}
      </span>
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