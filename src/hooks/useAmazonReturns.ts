import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AmazonReturn, ReturnsMetrics, ReturnsFilters, UploadedReturnsData } from '@/types/amazon-returns';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export const useAmazonReturns = (country: string) => {
  const [returns, setReturns] = useState<AmazonReturn[]>([]);
  const [metrics, setMetrics] = useState<ReturnsMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReturnsFilters>({});
  const { toast } = useToast();

  const fetchReturns = async () => {
    setLoading(true);
    try {
      // Fetch all records using pagination
      let allData: AmazonReturn[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('amazon_returns_data')
          .select('*', { count: 'exact' })
          .eq('country', country)
          .order('return_ratio', { ascending: false })
          .range(from, from + pageSize - 1);

        // Apply filters
        if (filters.searchQuery) {
          query = query.or(`asin.ilike.%${filters.searchQuery}%,product_title.ilike.%${filters.searchQuery}%`);
        }

        if (filters.dateRange?.from) {
          query = query.gte('upload_date', filters.dateRange.from.toISOString());
        }

        if (filters.dateRange?.to) {
          query = query.lte('upload_date', filters.dateRange.to.toISOString());
        }

        if (filters.returnRatioRange) {
          query = query
            .gte('return_ratio', filters.returnRatioRange.min)
            .lte('return_ratio', filters.returnRatioRange.max);
        }

        if (filters.quickFilter) {
          switch (filters.quickFilter) {
            case 'high':
              query = query.gt('return_ratio', 20);
              break;
            case 'medium':
              query = query.gte('return_ratio', 10).lte('return_ratio', 20);
              break;
            case 'low':
              query = query.lt('return_ratio', 10);
              break;
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      setReturns(allData);
    } catch (error: any) {
      toast({
        title: 'Error fetching returns data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async () => {
    try {
      // Fetch all records for metrics using pagination
      let allData: AmazonReturn[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('amazon_returns_data')
          .select('*')
          .eq('country', country)
          .range(from, from + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (!allData || allData.length === 0) {
        setMetrics({
          totalAsins: 0,
          totalShipped: 0,
          totalReturned: 0,
          averageReturnRatio: 0,
        });
        return;
      }

      const totalAsins = allData.length;
      const totalShipped = allData.reduce((sum, item) => sum + item.shipped_units, 0);
      const totalReturned = allData.reduce((sum, item) => sum + item.returned_units, 0);
      const averageReturnRatio = allData.reduce((sum, item) => sum + Number(item.return_ratio), 0) / totalAsins;

      const sortedByRatio = [...allData].sort((a, b) => Number(b.return_ratio) - Number(a.return_ratio));
      
      setMetrics({
        totalAsins,
        totalShipped,
        totalReturned,
        averageReturnRatio,
        highestReturnAsin: sortedByRatio[0] ? {
          asin: sortedByRatio[0].asin,
          ratio: Number(sortedByRatio[0].return_ratio),
        } : undefined,
        lowestReturnAsin: sortedByRatio[sortedByRatio.length - 1] ? {
          asin: sortedByRatio[sortedByRatio.length - 1].asin,
          ratio: Number(sortedByRatio[sortedByRatio.length - 1].return_ratio),
        } : undefined,
      });
    } catch (error: any) {
      toast({
        title: 'Error calculating metrics',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const uploadReturnsData = async (data: UploadedReturnsData[], fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const records = data.map(item => ({
        user_id: user.id,
        country,
        asin: item.asin,
        product_title: item.product_title,
        shipped_units: item.shipped_units,
        returned_units: item.returned_units,
        file_name: fileName,
        notes: item.notes,
      }));

      const { error } = await supabase
        .from('amazon_returns_data')
        .insert(records);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Uploaded ${records.length} records successfully`,
      });

      await fetchReturns();
      await calculateMetrics();
    } catch (error: any) {
      toast({
        title: 'Error uploading data',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateReturn = async (id: string, updates: Partial<AmazonReturn>) => {
    try {
      const { error } = await supabase
        .from('amazon_returns_data')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Return data updated successfully',
      });

      await fetchReturns();
      await calculateMetrics();
    } catch (error: any) {
      toast({
        title: 'Error updating return data',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteReturn = async (id: string) => {
    try {
      const { error } = await supabase
        .from('amazon_returns_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Return data deleted successfully',
      });

      await fetchReturns();
      await calculateMetrics();
    } catch (error: any) {
      toast({
        title: 'Error deleting return data',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const bulkDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('amazon_returns_data')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Deleted ${ids.length} records successfully`,
      });

      await fetchReturns();
      await calculateMetrics();
    } catch (error: any) {
      toast({
        title: 'Error deleting records',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportToExcel = async () => {
    try {
      const dataToExport = returns.map(item => ({
        ASIN: item.asin,
        'Product Title': item.product_title || '',
        'Shipped Units': item.shipped_units,
        'Returned Units': item.returned_units,
        'Return Ratio (%)': Number(item.return_ratio).toFixed(2),
        'Upload Date': new Date(item.upload_date).toLocaleDateString(),
        'File Name': item.file_name || '',
        Notes: item.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Returns Data');

      XLSX.writeFile(wb, `amazon_returns_${country}_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Success',
        description: 'Data exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error exporting data',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchReturns();
    calculateMetrics();
  }, [country, JSON.stringify(filters)]);

  return {
    returns,
    metrics,
    loading,
    filters,
    setFilters,
    fetchReturns,
    uploadReturnsData,
    updateReturn,
    deleteReturn,
    bulkDelete,
    exportToExcel,
  };
};
