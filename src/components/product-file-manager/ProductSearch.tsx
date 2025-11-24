import { useState, KeyboardEvent } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductSearchProps {
  searchTerms: string[];
  onSearchTermsChange: (terms: string[]) => void;
  resultsCount: number;
  totalCount: number;
}

export function ProductSearch({
  searchTerms,
  onSearchTermsChange,
  resultsCount,
  totalCount,
}: ProductSearchProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTerm = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !searchTerms.includes(trimmed)) {
      onSearchTermsChange([...searchTerms, trimmed]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTerm();
    }
  };

  const handleRemoveTerm = (termToRemove: string) => {
    onSearchTermsChange(searchTerms.filter(term => term !== termToRemove));
  };

  const hasActiveSearch = searchTerms.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Add search term and press Enter..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 bg-background"
          />
        </div>
        <Button
          onClick={handleAddTerm}
          disabled={!inputValue.trim()}
          size="default"
          variant="secondary"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {searchTerms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {searchTerms.map((term, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-3 py-1 text-sm gap-2"
            >
              {term}
              <button
                onClick={() => handleRemoveTerm(term)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {hasActiveSearch && (
        <p className="text-xs text-muted-foreground">
          {resultsCount} of {totalCount} products match your searches
        </p>
      )}
    </div>
  );
}
