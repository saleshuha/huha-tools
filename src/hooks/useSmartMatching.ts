import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { POOrder } from '@/hooks/usePOOrders';
import { SunskySKU } from '@/hooks/useSKUManager';
import { findMatches, MatchSuggestion } from '@/utils/fuzzy-matcher';
import { useMatchPatterns } from './useMatchPatterns';
import { useQueryClient } from '@tanstack/react-query';

export const useSmartMatching = (
  orders: POOrder[],
  sunskySKUs: SunskySKU[],
  userId: string | undefined
) => {
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { patterns, storePattern } = useMatchPatterns(userId);
  const queryClient = useQueryClient();

  // Analyze unmatched items and generate suggestions
  const analyzeUnmatchedItems = async () => {
    setIsAnalyzing(true);
    console.log('🤖 Starting smart matching analysis...');

    try {
      // Get unmatched orders (no sunsky_sku)
      const unmatched = orders.filter(o => !o.sunsky_sku?.id && o.status !== 'cancelled');
      console.log(`🤖 Found ${unmatched.length} unmatched orders`);

      if (unmatched.length === 0) {
        toast({
          title: 'All items matched!',
          description: 'No unmatched items found.',
        });
        setSuggestions([]);
        return;
      }

      // Run matching algorithm
      const matches = findMatches(unmatched, sunskySKUs, patterns);
      console.log(`🤖 Generated ${matches.length} match suggestions`);

      setSuggestions(matches);

      // Show summary
      const highConfidence = matches.filter(m => m.confidence >= 85).length;
      const mediumConfidence = matches.filter(m => m.confidence >= 65 && m.confidence < 85).length;
      const lowConfidence = matches.filter(m => m.confidence < 65).length;

      toast({
        title: 'Smart matching complete',
        description: `Found ${matches.length} suggestions: ${highConfidence} high, ${mediumConfidence} medium, ${lowConfidence} low confidence`,
      });
    } catch (error) {
      console.error('Error during smart matching:', error);
      toast({
        title: 'Matching failed',
        description: 'Failed to analyze unmatched items',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Approve a single match suggestion
  const approveMatch = async (suggestion: MatchSuggestion): Promise<boolean> => {
    try {
      console.log('✅ Approving match:', {
        poOrder: suggestion.poOrder.id,
        sunskySku: suggestion.suggestedSku.id,
        confidence: suggestion.confidence
      });

      // Update po_orders with matched SKU
      const { error: updateError } = await supabase
        .from('po_orders')
        .update({ 
          sunsky_sku_id: suggestion.suggestedSku.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestion.poOrder.id);

      if (updateError) throw updateError;

      // Store pattern for future learning (if SKUs exist)
      if (suggestion.poOrder.sku_code && suggestion.suggestedSku.sku_code && userId) {
        await storePattern(
          suggestion.poOrder.sku_code,
          suggestion.suggestedSku.sku_code,
          suggestion.confidence
        );
      }

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.poOrder.id !== suggestion.poOrder.id));

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['po-orders'] });

      toast({
        title: 'Match approved',
        description: `${suggestion.poOrder.sku_code || suggestion.poOrder.asin} → ${suggestion.suggestedSku.sku_code}`,
      });

      return true;
    } catch (error) {
      console.error('Error approving match:', error);
      toast({
        title: 'Failed to approve match',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Reject a match suggestion
  const rejectMatch = (suggestion: MatchSuggestion) => {
    console.log('❌ Rejecting match:', {
      poOrder: suggestion.poOrder.id,
      sunskySku: suggestion.suggestedSku.id
    });

    // Just remove from UI (could optionally store rejections in future)
    setSuggestions(prev => prev.filter(s => s.poOrder.id !== suggestion.poOrder.id));

    toast({
      title: 'Match rejected',
      description: 'Suggestion dismissed',
    });
  };

  // Approve all high-confidence matches at once
  const approveBulkMatches = async (minConfidence: number = 85): Promise<number> => {
    const highConfidenceMatches = suggestions.filter(s => s.confidence >= minConfidence);
    
    if (highConfidenceMatches.length === 0) {
      toast({
        title: 'No matches to approve',
        description: `No suggestions with confidence ≥ ${minConfidence}%`,
      });
      return 0;
    }

    console.log(`🚀 Bulk approving ${highConfidenceMatches.length} matches...`);

    let successCount = 0;
    for (const suggestion of highConfidenceMatches) {
      const success = await approveMatch(suggestion);
      if (success) successCount++;
    }

    toast({
      title: 'Bulk approval complete',
      description: `Successfully approved ${successCount} of ${highConfidenceMatches.length} matches`,
    });

    return successCount;
  };

  return {
    suggestions,
    isAnalyzing,
    analyzeUnmatchedItems,
    approveMatch,
    rejectMatch,
    approveBulkMatches
  };
};
