import { useState, useEffect } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImagePreview } from './ImagePreview';
import { POPriorityBadge } from '@/components/po/POPriorityBadge';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent' | 'po_group';
  asin?: string;
  sku_code?: string;
  model_number?: string;
  title?: string;
  context?: string;
  po_count?: number;
  serial_number?: string;
  po_numbers?: string[];
  image_url?: string;
  priority?: number;
  po_group?: {
    id: string;
    name: string;
    total_quantity: number;
    po_ids: string[];
    po_numbers: string[];
  };
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
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
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
          .select('asin, sku_code, model_number, title, po_number')
          .or(`asin.ilike.%${term}%,sku_code.ilike.%${term}%,model_number.ilike.%${term}%`)
          .in('status', ['pending', 'placed'])
          .limit(20);

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

        // Fetch images for all ASINs (both PO and inventory)
        const allAsins = [...new Set([
          ...(poData?.map(item => item.asin).filter(Boolean) || []),
          ...(invData?.map(item => item.asin).filter(Boolean) || [])
        ])];
        
        const { data: productImages } = allAsins.length > 0 
          ? await supabase
              .from('product_images')
              .select('asin, image_url')
              .in('asin', allAsins)
              .order('created_at', { ascending: false })
          : { data: null };

        const imageMap = new Map(productImages?.map(img => [img.asin, img.image_url]) || []);

        const searchResults: SearchResult[] = [];

        // Add PO results (group and collect PO numbers)
        if (poData && poData.length > 0) {
          const grouped = poData.reduce((acc, item) => {
            const key = item.asin || item.sku_code || item.model_number || 'unknown';
            if (!acc[key]) {
              acc[key] = { ...item, count: 0, po_numbers: [] };
            }
            acc[key].count++;
            if (item.po_number && !acc[key].po_numbers.includes(item.po_number)) {
              acc[key].po_numbers.push(item.po_number);
            }
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
              po_count: item.count,
              po_numbers: item.po_numbers,
              image_url: item.asin ? imageMap.get(item.asin) : undefined
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
                  : 'Already in inventory',
                image_url: item.asin ? imageMap.get(item.asin) : undefined
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
          {results.map((result, index) => {
            const identifier = result.asin || result.sku_code || result.model_number;
            const isPO = result.type === 'po' || result.type === 'po_group';
            const isGrouped = result.type === 'po_group';
            
            return (
              <button
                key={index}
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-accent/50 border-b border-border/50 last:border-0 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Product Image */}
                  <ImagePreview 
                    imageUrl={result.image_url}
                    alt={result.title || identifier || 'Product'}
                    size="md"
                    showFullOnClick={false}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={isPO ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {isPO ? '📦 PO' : '📥 Inventory'}
                      </Badge>
                      <div className="font-medium text-foreground truncate">
                        {identifier}
                      </div>
                      {isGrouped && result.po_group && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          <Users className="w-3 h-3 mr-1" />
                          {result.po_group.name}
                        </Badge>
                      )}
                      {result.priority && <POPriorityBadge priority={result.priority} onUpdate={() => {}} />}
                    </div>
                    
                    {result.title && (
                      <div className="text-sm text-muted-foreground truncate mt-1">
                        {result.title}
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="text-xs text-primary">
                        {result.context}
                      </div>
                      {result.po_numbers && result.po_numbers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.po_numbers.slice(0, 3).map((poNum, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                            >
                              {poNum}
                            </span>
                          ))}
                          {result.po_numbers.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{result.po_numbers.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
