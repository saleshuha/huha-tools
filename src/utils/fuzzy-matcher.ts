import Fuse from 'fuse.js';
import { POOrder } from '@/hooks/usePOOrders';
import { SunskySKU } from '@/hooks/useSKUManager';

export interface MatchPattern {
  id: string;
  user_id: string;
  po_sku_pattern: string;
  sunsky_sku_pattern: string;
  confidence_score: number;
  times_used: number;
  last_used_at: string;
  created_at: string;
}

export interface MatchSuggestion {
  poOrder: POOrder;
  suggestedSku: SunskySKU;
  confidence: number; // 0-100
  reason: string;
  matchType: 'historical' | 'sku_fuzzy' | 'title_fuzzy' | 'model_fuzzy';
}

/**
 * Find historical match pattern for a PO order
 */
const findHistoricalMatch = (
  order: POOrder,
  patterns: MatchPattern[],
  sunskySKUs: SunskySKU[]
): MatchSuggestion | null => {
  if (!order.sku_code) return null;

  const matchingPattern = patterns.find(p => 
    p.po_sku_pattern.toLowerCase() === order.sku_code?.toLowerCase()
  );

  if (matchingPattern) {
    const matchedSku = sunskySKUs.find(s => 
      s.sku_code?.toLowerCase() === matchingPattern.sunsky_sku_pattern.toLowerCase()
    );

    if (matchedSku) {
      return {
        poOrder: order,
        suggestedSku: matchedSku,
        confidence: Math.min(matchingPattern.confidence_score + 10, 100), // Boost historical matches
        reason: `Previously matched ${matchingPattern.times_used} time${matchingPattern.times_used > 1 ? 's' : ''}`,
        matchType: 'historical'
      };
    }
  }

  return null;
};

/**
 * Normalize SKU for better matching (remove special chars, lowercase)
 */
const normalizeSku = (sku: string | null | undefined): string => {
  if (!sku) return '';
  return sku.toLowerCase().replace(/[-_\s]/g, '');
};

/**
 * Find matches using fuzzy string matching
 */
export const findMatches = (
  unmatchedOrders: POOrder[],
  sunskySKUs: SunskySKU[],
  historicalPatterns: MatchPattern[]
): MatchSuggestion[] => {
  const suggestions: MatchSuggestion[] = [];

  unmatchedOrders.forEach(order => {
    // Step 1: Check historical patterns first (highest confidence)
    const historicalMatch = findHistoricalMatch(order, historicalPatterns, sunskySKUs);
    if (historicalMatch) {
      suggestions.push(historicalMatch);
      return;
    }

    // Step 2: Fuzzy search on SKU code
    if (order.sku_code) {
      const fuse = new Fuse(sunskySKUs, {
        keys: [
          { name: 'sku_code', weight: 1.0 }
        ],
        threshold: 0.35, // 65% similarity required
        includeScore: true,
        ignoreLocation: true,
        useExtendedSearch: true
      });

      const results = fuse.search(order.sku_code);
      
      if (results.length > 0 && results[0].score && results[0].score < 0.35) {
        const confidence = Math.round((1 - results[0].score) * 100);
        
        // Additional check: normalized SKU similarity
        const normalizedOrderSku = normalizeSku(order.sku_code);
        const normalizedMatchSku = normalizeSku(results[0].item.sku_code);
        
        if (normalizedOrderSku && normalizedMatchSku && 
            normalizedOrderSku.includes(normalizedMatchSku.substring(0, 5)) ||
            normalizedMatchSku.includes(normalizedOrderSku.substring(0, 5))) {
          suggestions.push({
            poOrder: order,
            suggestedSku: results[0].item,
            confidence: Math.min(confidence + 15, 95), // Boost for normalized match
            reason: `SKU pattern match (${confidence}% similar)`,
            matchType: 'sku_fuzzy'
          });
          return;
        }

        if (confidence >= 70) {
          suggestions.push({
            poOrder: order,
            suggestedSku: results[0].item,
            confidence,
            reason: `SKU similarity: ${confidence}%`,
            matchType: 'sku_fuzzy'
          });
          return;
        }
      }
    }

    // Step 3: Fuzzy search on model number (if available)
    if (order.model_number) {
      const modelFuse = new Fuse(sunskySKUs, {
        keys: ['description'],
        threshold: 0.25,
        includeScore: true,
        ignoreLocation: true
      });

      const modelResults = modelFuse.search(order.model_number);
      
      if (modelResults.length > 0 && modelResults[0].score && modelResults[0].score < 0.25) {
        const confidence = Math.round((1 - modelResults[0].score) * 95);
        suggestions.push({
          poOrder: order,
          suggestedSku: modelResults[0].item,
          confidence,
          reason: `Model number match (${confidence}% similar)`,
          matchType: 'model_fuzzy'
        });
        return;
      }
    }

    // Step 4: Fuzzy search on product title (lower confidence)
    if (order.title) {
      const titleFuse = new Fuse(sunskySKUs, {
        keys: ['title'],
        threshold: 0.45,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 4
      });

      const titleResults = titleFuse.search(order.title);
      
      if (titleResults.length > 0 && titleResults[0].score && titleResults[0].score < 0.45) {
        const confidence = Math.round((1 - titleResults[0].score) * 65); // Lower confidence multiplier for titles
        
        if (confidence >= 50) {
          suggestions.push({
            poOrder: order,
            suggestedSku: titleResults[0].item,
            confidence,
            reason: `Product title similarity`,
            matchType: 'title_fuzzy'
          });
        }
      }
    }
  });

  // Sort by confidence (highest first), then by match type priority
  return suggestions.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    // Priority: historical > model > sku > title
    const typePriority: Record<string, number> = {
      historical: 4,
      model_fuzzy: 3,
      sku_fuzzy: 2,
      title_fuzzy: 1
    };
    return (typePriority[b.matchType] || 0) - (typePriority[a.matchType] || 0);
  });
};

/**
 * Get confidence level label
 */
export const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 85) return 'high';
  if (confidence >= 65) return 'medium';
  return 'low';
};
