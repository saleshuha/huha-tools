import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MatchPattern } from '@/utils/fuzzy-matcher';

export const useMatchPatterns = (userId: string | undefined) => {
  const [patterns, setPatterns] = useState<MatchPattern[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch patterns from database
  const fetchPatterns = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sku_match_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('times_used', { ascending: false })
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      setPatterns(data || []);
    } catch (error) {
      console.error('Error fetching match patterns:', error);
      toast({
        title: 'Error loading patterns',
        description: 'Failed to load historical matching patterns',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Store a new pattern or update existing one
  const storePattern = async (
    poSku: string,
    sunskySku: string,
    confidence: number
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Check if pattern already exists
      const { data: existing } = await supabase
        .from('sku_match_patterns')
        .select('*')
        .eq('user_id', userId)
        .eq('po_sku_pattern', poSku)
        .eq('sunsky_sku_pattern', sunskySku)
        .single();

      if (existing) {
        // Update existing pattern - increment usage
        const { error } = await supabase
          .from('sku_match_patterns')
          .update({
            times_used: existing.times_used + 1,
            last_used_at: new Date().toISOString(),
            confidence_score: Math.max(existing.confidence_score, confidence) // Keep highest confidence
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new pattern
        const { error } = await supabase
          .from('sku_match_patterns')
          .insert({
            user_id: userId,
            po_sku_pattern: poSku,
            sunsky_sku_pattern: sunskySku,
            confidence_score: confidence,
            times_used: 1,
            last_used_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Refresh patterns
      await fetchPatterns();
      return true;
    } catch (error) {
      console.error('Error storing match pattern:', error);
      return false;
    }
  };

  // Delete a pattern
  const deletePattern = async (patternId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sku_match_patterns')
        .delete()
        .eq('id', patternId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchPatterns();
      return true;
    } catch (error) {
      console.error('Error deleting pattern:', error);
      return false;
    }
  };

  // Load patterns on mount
  useEffect(() => {
    if (userId) {
      fetchPatterns();
    }
  }, [userId]);

  return {
    patterns,
    isLoading,
    fetchPatterns,
    storePattern,
    deletePattern
  };
};
