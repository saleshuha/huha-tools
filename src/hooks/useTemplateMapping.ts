import { useCallback } from 'react';
import { ColumnMapping } from '@/types/excel';

export const useTemplateMapping = () => {
  const generateMappings = useCallback((sourceHeaders: string[], targetHeaders: string[]): ColumnMapping => {
    const mappings: ColumnMapping = {};
    
    // Simple fuzzy matching logic
    targetHeaders.forEach(targetHeader => {
      const targetLower = targetHeader.toLowerCase().trim();
      
      // Find best match from source headers
      let bestMatch = '';
      let bestScore = 0;
      
      sourceHeaders.forEach(sourceHeader => {
        const sourceLower = sourceHeader.toLowerCase().trim();
        
        // Exact match
        if (sourceLower === targetLower) {
          bestMatch = sourceHeader;
          bestScore = 1;
          return;
        }
        
        // Contains match
        if (sourceLower.includes(targetLower) || targetLower.includes(sourceLower)) {
          const score = Math.max(sourceLower.length, targetLower.length) / 
                       (sourceLower.length + targetLower.length);
          if (score > bestScore) {
            bestMatch = sourceHeader;
            bestScore = score;
          }
        }
        
        // Common patterns
        const patterns: Record<string, string[]> = {
          'sku': ['sku', 'product_id', 'item_id', 'product_code'],
          'title': ['title', 'name', 'product_name', 'description'],
          'price': ['price', 'cost', 'amount', 'value'],
          'quantity': ['quantity', 'qty', 'amount', 'count'],
          'date': ['date', 'created', 'updated', 'time'],
        };
        
        Object.entries(patterns).forEach(([key, keywords]) => {
          if (targetLower.includes(key)) {
            keywords.forEach(keyword => {
              if (sourceLower.includes(keyword)) {
                const score = 0.7;
                if (score > bestScore) {
                  bestMatch = sourceHeader;
                  bestScore = score;
                }
              }
            });
          }
        });
      });
      
      // Only add mapping if confidence is reasonable
      if (bestScore > 0.3 && bestMatch) {
        mappings[bestMatch] = targetHeader;
      }
    });
    
    return mappings;
  }, []);

  return { generateMappings };
};