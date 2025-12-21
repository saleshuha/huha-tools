import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MatchedItem {
  identifier: string;
  identifierType: 'asin' | 'sku';
  title?: string;
  requiredQty: number;
  inStockQty: number;
  pendingQty: number;
  availableQty: number;
  shortageQty: number;
  status: 'in-stock' | 'partial' | 'out-of-stock';
  inventoryIds: string[];
}

export interface MatchingSummary {
  totalItems: number;
  matchedCount: number;
  inStockCount: number;
  partialCount: number;
  outOfStockCount: number;
  totalRequired: number;
  totalAvailable: number;
  totalShortage: number;
}

export interface MatchingSession {
  id?: string;
  sessionName: string;
  fileName?: string;
  results: MatchedItem[];
  summary: MatchingSummary;
  createdAt: Date;
}

interface InventoryItem {
  id: string;
  asin: string;
  sku: string | null;
  title: string | null;
  quantity: number;
  status: string;
}

export function useInventoryMatching() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<MatchedItem[]>([]);
  const [summary, setSummary] = useState<MatchingSummary | null>(null);

  // Auto-detect identifier type from column data
  const detectIdentifierType = useCallback((values: string[]): 'asin' | 'sku' => {
    // ASINs are typically 10 characters alphanumeric starting with B
    const asinPattern = /^[A-Z0-9]{10}$/i;
    const asinLikeCount = values.filter(v => asinPattern.test(v.trim())).length;
    
    // If majority look like ASINs, treat as ASIN column
    return asinLikeCount > values.length / 2 ? 'asin' : 'sku';
  }, []);

  // Fetch user's inventory
  const fetchInventory = useCallback(async (): Promise<InventoryItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('asin_inventory')
      .select('id, asin, sku, title, quantity, status')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;
    return (data || []) as InventoryItem[];
  }, []);

  // Main matching function
  const runMatching = useCallback(async (
    items: { identifier: string; quantity: number }[],
    identifierColumn: string,
    sessionName: string,
    fileName?: string
  ): Promise<MatchingSession> => {
    setIsProcessing(true);
    
    try {
      // Get user's inventory
      const inventory = await fetchInventory();
      
      // Detect identifier type from first few values
      const sampleValues = items.slice(0, 10).map(i => i.identifier);
      const identifierType = detectIdentifierType(sampleValues);
      
      // Create lookup maps
      const inventoryByAsin = new Map<string, InventoryItem[]>();
      const inventoryBySku = new Map<string, InventoryItem[]>();
      
      inventory.forEach(item => {
        // Group by ASIN
        const asinKey = item.asin.toLowerCase();
        if (!inventoryByAsin.has(asinKey)) {
          inventoryByAsin.set(asinKey, []);
        }
        inventoryByAsin.get(asinKey)!.push(item);
        
        // Group by SKU
        if (item.sku) {
          const skuKey = item.sku.toLowerCase();
          if (!inventoryBySku.has(skuKey)) {
            inventoryBySku.set(skuKey, []);
          }
          inventoryBySku.get(skuKey)!.push(item);
        }
      });

      // Process each item
      const matchedResults: MatchedItem[] = [];
      
      for (const item of items) {
        const key = item.identifier.trim().toLowerCase();
        if (!key) continue;
        
        // Try to find matches (ASIN first, then SKU)
        let matches: InventoryItem[] = [];
        let detectedType: 'asin' | 'sku' = identifierType;
        
        if (identifierType === 'asin') {
          matches = inventoryByAsin.get(key) || [];
          if (matches.length === 0) {
            // Fallback to SKU search
            matches = inventoryBySku.get(key) || [];
            if (matches.length > 0) detectedType = 'sku';
          }
        } else {
          matches = inventoryBySku.get(key) || [];
          if (matches.length === 0) {
            // Fallback to ASIN search
            matches = inventoryByAsin.get(key) || [];
            if (matches.length > 0) detectedType = 'asin';
          }
        }

        // Calculate quantities
        const inStockQty = matches
          .filter(m => m.status === 'in-stock')
          .reduce((sum, m) => sum + (m.quantity || 0), 0);
        
        const pendingQty = matches
          .filter(m => m.status === 'ordered' || m.status === 'pending')
          .reduce((sum, m) => sum + (m.quantity || 0), 0);
        
        const totalAvailable = inStockQty;
        const availableQty = Math.min(item.quantity, totalAvailable);
        const shortageQty = Math.max(0, item.quantity - totalAvailable);
        
        // Determine status
        let status: 'in-stock' | 'partial' | 'out-of-stock';
        if (totalAvailable >= item.quantity) {
          status = 'in-stock';
        } else if (totalAvailable > 0) {
          status = 'partial';
        } else {
          status = 'out-of-stock';
        }

        matchedResults.push({
          identifier: item.identifier.trim(),
          identifierType: detectedType,
          title: matches[0]?.title || undefined,
          requiredQty: item.quantity,
          inStockQty,
          pendingQty,
          availableQty,
          shortageQty,
          status,
          inventoryIds: matches.map(m => m.id)
        });
      }

      // Calculate summary
      const matchingSummary: MatchingSummary = {
        totalItems: matchedResults.length,
        matchedCount: matchedResults.filter(r => r.inventoryIds.length > 0).length,
        inStockCount: matchedResults.filter(r => r.status === 'in-stock').length,
        partialCount: matchedResults.filter(r => r.status === 'partial').length,
        outOfStockCount: matchedResults.filter(r => r.status === 'out-of-stock').length,
        totalRequired: matchedResults.reduce((sum, r) => sum + r.requiredQty, 0),
        totalAvailable: matchedResults.reduce((sum, r) => sum + r.availableQty, 0),
        totalShortage: matchedResults.reduce((sum, r) => sum + r.shortageQty, 0)
      };

      setResults(matchedResults);
      setSummary(matchingSummary);

      // Save session to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any)
          .from('inventory_match_sessions')
          .insert({
            user_id: user.id,
            session_name: sessionName,
            file_name: fileName,
            total_items: matchingSummary.totalItems,
            matched_count: matchingSummary.matchedCount,
            in_stock_count: matchingSummary.inStockCount,
            partial_stock_count: matchingSummary.partialCount,
            out_of_stock_count: matchingSummary.outOfStockCount,
            match_results: matchedResults
          });
      }

      toast.success(`Matching complete: ${matchingSummary.inStockCount} in stock, ${matchingSummary.partialCount} partial, ${matchingSummary.outOfStockCount} out of stock`);

      return {
        sessionName,
        fileName,
        results: matchedResults,
        summary: matchingSummary,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Matching error:', error);
      toast.error('Failed to run inventory matching');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchInventory, detectIdentifierType]);

  // Export results to CSV
  const exportToCSV = useCallback((data: MatchedItem[], sessionName: string) => {
    const headers = [
      'Identifier',
      'Type',
      'Title',
      'Required Qty',
      'In Stock',
      'Pending',
      'Available',
      'Shortage',
      'Status'
    ];

    const rows = data.map(item => [
      item.identifier,
      item.identifierType.toUpperCase(),
      item.title || '',
      item.requiredQty.toString(),
      item.inStockQty.toString(),
      item.pendingQty.toString(),
      item.availableQty.toString(),
      item.shortageQty.toString(),
      item.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-matching-${sessionName}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success('CSV exported successfully');
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setResults([]);
    setSummary(null);
  }, []);

  return {
    isProcessing,
    results,
    summary,
    runMatching,
    exportToCSV,
    clearResults,
    detectIdentifierType
  };
}
