import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ProductSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  resultsCount: number;
  totalCount: number;
}

export function ProductSearch({
  searchTerm,
  onSearchChange,
  resultsCount,
  totalCount,
}: ProductSearchProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by product title..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 pr-9 bg-background"
        />
        {localSearch && (
          <button
            onClick={() => {
              setLocalSearch('');
              onSearchChange('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {searchTerm && (
        <p className="text-xs text-muted-foreground">
          {resultsCount} of {totalCount} products match your search
        </p>
      )}
    </div>
  );
}
