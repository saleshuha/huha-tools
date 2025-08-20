import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ImportJob {
  id: string;
  type: 'category' | 'brand' | 'keyword' | 'itemNos';
  criteria: Record<string, any>;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  total_items?: number;
  processed_items: number;
  success_count: number;
  error_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  last_error?: string;
  paused?: boolean;
  cancelled?: boolean;
}

export const useImportJobs = () => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Set up real-time subscription for job updates
  useEffect(() => {
    const channel = supabase
      .channel('import-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sunsky_import_jobs'
        },
        (payload) => {
          console.log('Job update received:', payload);
          // Refresh jobs when changes occur
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Poll for job updates as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll if we have active jobs
      if (jobs.some(job => job.status === 'processing' || job.status === 'queued')) {
        fetchJobs();
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobs]);

  const callSunskyAPI = useCallback(async (action: string, data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch('https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/sunsky-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }, []);

  const createImportJob = useCallback(async (type: string, criteria: Record<string, any>) => {
    try {
      setIsLoading(true);
      const result = await callSunskyAPI('createImportJob', { type, criteria });
      
      if (result.result === 'success') {
        toast({
          title: "Success",
          description: "Import job created successfully"
        });
        
        // Start the job immediately
        await callSunskyAPI('startImportJob', { jobId: result.data.id });
        
        // Refresh jobs list
        await fetchJobs();
        
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create import job');
      }
    } catch (error) {
      console.error('Error creating import job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create import job",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [callSunskyAPI, toast]);

  const createItemNosJob = useCallback(async (itemNos: string[]) => {
    try {
      setIsLoading(true);
      const result = await callSunskyAPI('createItemNosJob', { itemNos });
      
      if (result.result === 'success') {
        toast({
          title: "Success",
          description: "Background import job started"
        });
        
        // Refresh jobs list
        await fetchJobs();
        
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create import job');
      }
    } catch (error) {
      console.error('Error creating itemNos job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create import job",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [callSunskyAPI, toast]);

  const createPoSearchJob = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await callSunskyAPI('createPoSearchJob', {});
      
      if (result.result === 'success') {
        toast({
          title: "Success",
          description: "Background PO search job started"
        });
        
        // Refresh jobs list
        await fetchJobs();
        
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create PO search job');
      }
    } catch (error) {
      console.error('Error creating PO search job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create PO search job",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [callSunskyAPI, toast]);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await callSunskyAPI('listImportJobs', {});
      
      if (result.result === 'success') {
        setJobs(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch jobs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [callSunskyAPI, toast]);

  const getJobStatus = useCallback(async (jobId: string) => {
    try {
      const result = await callSunskyAPI('getJobStatus', { jobId });
      
      if (result.result === 'success') {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to get job status');
      }
    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }, [callSunskyAPI]);

  return {
    jobs,
    isLoading,
    createImportJob,
    createItemNosJob,
    createPoSearchJob,
    fetchJobs,
    getJobStatus
  };
};