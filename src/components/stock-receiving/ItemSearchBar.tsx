import { useState, useEffect } from 'react';
import { Search, Loader2, Users, Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImagePreview } from './ImagePreview';
import { getPriorityLabel } from '@/utils/po-group-helpers';

interface SearchResult {
  type: 'po' | 'inventory' | 'recent' | 'po_group' | 'not_found';
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
  searched_term?: string;
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
        // Debug: Check authentication state
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('🔍 Search - Current user:', user?.id || 'No user');
        console.log('🔍 Search - Search term:', searchTerm);
        console.log('🔍 Search - Country filter:', country || 'All countries');
        
        if (authError) {
          console.error('❌ Search - Auth error:', authError.message);
        }
        
        if (!user) {
          console.warn('⚠️ Search - No authenticated user, queries will fail due to RLS');
          toast.error('Please sign in to search items');
          setSearching(false);
          return;
        }
        
        const term = searchTerm.trim().toUpperCase();
        
        // Search in open POs
        const { data: poData, error: poError } = await supabase
          .from('po_orders')
          .select('id, asin, sku_code, model_number, title, po_number, priority')
          .or(`asin.ilike.%${term}%,sku_code.ilike.%${term}%,model_number.ilike.%${term}%`)
          .in('status', ['pending', 'placed'])
          .limit(20);
        
        console.log('📦 Search - PO results:', poData?.length || 0, 'items');
        if (poError) {
          console.error('❌ Search - PO query error:', poError.message);
        }

        // Get group memberships for these POs
        let poGroupMap = new Map<string, string>();
        if (poData && poData.length > 0) {
          const poIds = poData.map(po => po.id);
          const { data: groupMembers } = await supabase
            .from('po_group_members')
            .select('po_id, group_id')
            .in('po_id', poIds);
          
          if (groupMembers) {
            groupMembers.forEach(member => {
              poGroupMap.set(member.po_id, member.group_id);
            });
          }
        }

        // Search in inventory (filter by selected country, fetch serial_number)
        let invQuery = supabase
          .from('asin_inventory')
          .select('asin, sku, title, country, serial_number')
          .or(`asin.ilike.%${term}%,sku.ilike.%${term}%`);
        
        // Filter by country if provided
        if (country) {
          invQuery = invQuery.eq('country', country);
        }
        
        const { data: invData, error: invError } = await invQuery.limit(5);
        
        console.log('📦 Search - Inventory results:', invData?.length || 0, 'items');
        if (invError) {
          console.error('❌ Search - Inventory query error:', invError.message);
        }

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

        // Add PO results (group by item AND group membership)
        if (poData && poData.length > 0) {
          // Fetch group information if any POs have group_id
          const groupIds = [...new Set(Array.from(poGroupMap.values()))];
          let groupMap = new Map();
          
          if (groupIds.length > 0) {
            const { data: groupData } = await supabase
              .from('po_groups')
              .select('id, group_name, priority')
              .in('id', groupIds);
            
            groupMap = new Map(groupData?.map(g => [g.id, g]) || []);
          }

          // Group by BOTH item identifier AND group membership
          const grouped = poData.reduce((acc, item) => {
            const itemKey = item.asin || item.sku_code || item.model_number || 'unknown';
            const groupId = poGroupMap.get(item.id);
            // Create a unique key combining item and group (or 'ungrouped')
            const key = `${itemKey}_${groupId || 'ungrouped'}`;
            
            if (!acc[key]) {
              acc[key] = { 
                ...item, 
                count: 0, 
                po_numbers: [],
                max_priority: item.priority || 0,
                group_id: groupId,
                item_identifier: itemKey
              };
            }
            acc[key].count++;
            if (item.po_number && !acc[key].po_numbers.includes(item.po_number)) {
              acc[key].po_numbers.push(item.po_number);
            }
            // Track the highest priority
            if (item.priority && item.priority > acc[key].max_priority) {
              acc[key].max_priority = item.priority;
            }
            return acc;
          }, {} as any);

          Object.values(grouped).forEach((item: any) => {
            const groupInfo = item.group_id ? groupMap.get(item.group_id) : null;
            
            searchResults.push({
              type: groupInfo ? 'po_group' : 'po',
              asin: item.asin,
              sku_code: item.sku_code,
              model_number: item.model_number,
              title: item.title,
              context: groupInfo 
                ? `Found in ${item.count} PO${item.count > 1 ? 's' : ''} in ${groupInfo.group_name}`
                : `Found in ${item.count} ungrouped PO${item.count > 1 ? 's' : ''}`,
              po_count: item.count,
              po_numbers: item.po_numbers,
              priority: groupInfo ? groupInfo.priority : item.max_priority,
              po_group: groupInfo ? {
                id: item.group_id,
                name: groupInfo.group_name,
                total_quantity: item.count,
                po_ids: [],
                po_numbers: item.po_numbers
              } : undefined,
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

        // If no results found, add a "not found" message
        if (searchResults.length === 0) {
          searchResults.push({
            type: 'not_found',
            searched_term: term,
            asin: term,
            context: 'Item not found in PO orders or inventory'
          });
        }

        // Return combined results
        console.log('✅ Search - Total results:', searchResults.length);
        setResults(searchResults);
        setShowDropdown(searchTerm.length >= 3);
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
    // Don't allow selection of "not found" items
    if (result.type === 'not_found') {
      return;
    }
    
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
            // Handle "not found" case
            if (result.type === 'not_found') {
              return (
                <div
                  key={index}
                  className="w-full px-4 py-4 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-muted/50 rounded flex items-center justify-center">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50 border-yellow-200">
                          ⚠️ Not Found
                        </Badge>
                        <div className="font-medium text-foreground">
                          "{result.searched_term}"
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        This item was not found in any pending PO orders or inventory.
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <div className="font-medium text-blue-900 mb-1">
                          📝 Next Steps:
                        </div>
                        <div className="text-blue-700">
                          Please add this item to inventory first before receiving stock.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
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
                    {/* PO Numbers First */}
                    {result.po_numbers && result.po_numbers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {result.po_numbers.slice(0, 3).map((poNum, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/15 text-primary border border-primary/30"
                          >
                            PO: {poNum}
                          </span>
                        ))}
                        {result.po_numbers.length > 3 && (
                          <span className="text-xs text-muted-foreground font-medium">
                            +{result.po_numbers.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badge + ASIN */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={isPO ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {isPO ? '📦 PO' : '📥 Inventory'}
                      </Badge>
                      <div className="font-medium text-foreground truncate">
                        {identifier}
                      </div>
                    </div>
                    
                    {/* Title */}
                    {result.title && (
                      <div className="text-sm text-muted-foreground truncate mt-1">
                        {result.title}
                      </div>
                    )}
                    
                    {/* Status/Context */}
                    <div className="text-xs text-primary mt-1">
                      {result.context}
                    </div>
                  </div>

                  {/* Priority and Group Badges on the Right */}
                  <div className="flex flex-col gap-2 items-end ml-auto shrink-0">
                    {isGrouped && result.po_group && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          <Folder className="w-3 h-3 mr-1" />
                          {result.po_group.name}
                        </Badge>
                        {result.priority && (
                          <Badge 
                            variant={result.priority === 1 ? "destructive" : result.priority === 2 ? "default" : "secondary"}
                            className="text-xs whitespace-nowrap"
                            title={`Priority inherited from group: ${result.po_group.name}`}
                          >
                            {getPriorityLabel(result.priority)}
                          </Badge>
                        )}
                      </>
                    )}
                    {!isGrouped && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Not in group
                      </Badge>
                    )}
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
