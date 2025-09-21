import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface AIImageMatch {
  type: 'inventory';
  item: {
    id: string;
    asin: string;
    sku?: string;
    title?: string;
    quantity: number;
    status: string;
    imageUrl?: string;
  };
  similarity: number;
  reasons: string[];
}

export interface AIImageSearchResult {
  description: string;
  matches: AIImageMatch[];
  totalMatches: number;
}

export function useAIImageSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AIImageSearchResult | null>(null);
  const { toast } = useToast();

  const searchByImage = async (imageUrl: string): Promise<AIImageSearchResult | null> => {
    if (!imageUrl.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please provide a valid image URL",
        variant: "destructive"
      });
      return null;
    }

    setIsSearching(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Starting AI image search for:', imageUrl);

      const { data, error } = await supabase.functions.invoke('ai-image-search', {
        body: {
          imageUrl: imageUrl.trim(),
          userId: user.id
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from search');
      }

      console.log('AI image search result:', data);

      const result: AIImageSearchResult = {
        description: data.description || 'No description available',
        matches: data.matches || [],
        totalMatches: data.totalMatches || 0
      };

      setSearchResult(result);

      toast({
        title: "Image Analysis Complete",
        description: `Found ${result.matches.length} matching items in your inventory`,
        variant: result.matches.length > 0 ? "default" : "destructive"
      });

      return result;

    } catch (error) {
      console.error('AI image search error:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to analyze image",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setSearchResult(null);
  };

  return {
    searchByImage,
    clearResults,
    isSearching,
    searchResult
  };
}