import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LabelDataset {
  id: string;
  name: string;
  description: string;
  data: any[];
  headers: string[];
  row_count: number;
  created_at: string;
  updated_at: string;
}

export function useLabelDataset(datasetId: string | null) {
  const [dataset, setDataset] = useState<LabelDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) {
      setDataset(null);
      return;
    }

    loadDataset(datasetId);
  }, [datasetId]);

  const loadDataset = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('label_datasets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setDataset({
        ...(data as any),
        data: Array.isArray((data as any).data) ? (data as any).data : [],
        headers: Array.isArray((data as any).headers) ? (data as any).headers.map((h: any) => String(h)) : []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dataset');
      setDataset(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    dataset,
    loading,
    error,
    reload: () => datasetId && loadDataset(datasetId)
  };
}