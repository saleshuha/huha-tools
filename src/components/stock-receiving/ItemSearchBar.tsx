import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  context?: string;
  po_count?: number;
  serial_number?: string;
}

interface ItemSearchBarProps {
  onItemSelect: (result: SearchResult) => void;
  disabled?: boolean;
  country?: string;
}

export function ItemSearchBar({ onItemSelect, disabled, country }: ItemSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const searchItems = async () => {
      if (searchTerm.length < 3) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setSearching(true);
      try {
        const term = searchTerm.trim().toUpperCase();
        
        // Search in open POs
        const { data: poData } = await supabase
          .from('po_orders')
          .select('asin, sku_code, model_number, title')
          .in('status', ['pending', 'placed'])
          .or(`asin.ilike.%${term}%,sku_code.ilike.%${term}%,model_number.ilike.%${term}%`)
          .limit(5);

        // Search in inventory (filter by selected country, fetch serial_number)
        let invQuery = supabase
          .from('asin_inventory')
          .select('asin, sku, title, country, serial_number')
          .or(`asin.ilike.%${term}%,sku.ilike.%${term}%`);
        
        // Filter by country if provided
        if (country) {
          invQuery = invQuery.eq('country', country);
        }
        
        const { data: invData } = await invQuery.limit(5);

        const searchResults: SearchResult[] = [];

        // Add PO results
        if (poData && poData.length > 0) {
          const grouped = poData.reduce((acc, item) => {
            const key = item.asin || item.sku_code || item.model_number || 'unknown';
            if (!acc[key]) {
              acc[key] = { ...item, count: 0 };
            }
            acc[key].count++;
            return acc;
          }, {} as any);

          Object.values(grouped).forEach((item: any) => {
            searchResults.push({
              type: 'po',
              asin: item.asin,
              sku_code: item.sku_code,
              model_number: item.model_number,
              title: item.title,
              context: `Found in ${item.count} pending PO${item.count > 1 ? 's' : ''}`,
              po_count: item.count
            });
          });
        }

        // Add inventory results
        if (invData && invData.length > 0) {
          invData.forEach(item => {
            const exists = searchResults.find(r => 
              r.asin === item.asin || r.sku_code === item.sku
            );
            if (!exists) {
              searchResults.push({
                type: 'inventory',
                asin: item.asin,
                sku_code: item.sku,
                title: item.title,
                serial_number: item.serial_number,
                context: item.serial_number 
                  ? `Already in inventory (SN: ${item.serial_number})`
                  : 'Already in inventory'
              });
            }
          });
        }

        // If no results, show informative message in dropdown
        if (searchResults.length === 0) {
          searchResults.push({
            type: 'inventory',
            asin: term.startsWith('B0') ? term : undefined,
            sku_code: !term.startsWith('B0') ? term : undefined,
            context: `⚠️ No open POs or inventory found. Note: Closed POs (already fulfilled) are excluded to prevent duplicate stock entries.`
          });
        }

        setResults(searchResults);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchItems, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, country]);

  const handleSelect = (result: SearchResult) => {
    setShowDropdown(false);
    setSearchTerm('');
    onItemSelect(result);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search by ASIN, SKU, or Model Number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="pl-10 pr-10 h-12 text-base bg-background/80 border-primary/20 focus:border-primary"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
          {results.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-accent/50 border-b border-border/50 last:border-0 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {result.asin || result.sku_code || result.model_number}
                  </div>
                  {result.title && (
                    <div className="text-sm text-muted-foreground truncate mt-1">
                      {result.title}
                    </div>
                  )}
                  <div className="text-xs text-primary mt-1">
                    {result.context}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  result.type === 'po' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-accent text-accent-foreground'
                }`}>
                  {result.type === 'po' ? '🏢 PO' : '📦 Inventory'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
