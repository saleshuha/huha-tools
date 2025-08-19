import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ImportJob {
  id: string;
  type: 'category' | 'brand' | 'keyword' | 'itemNos';
  criteria: Record<string, any>;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed';
  total_items?: number;
  processed_items: number;
  success_count: number;
  error_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  last_error?: string;
}

export const useImportJobs = () => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const callSunskyAPI = useCallback(async (action: string, data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('sunsky-api', {
      body: { action, ...data },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'API request failed');
    }

    return response.data;
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching import jobs...');
      
      const result = await callSunskyAPI('listImportJobs', {});
      console.log('Jobs fetch result:', result);
      
      if (result.result === 'success') {
        setJobs(result.data);
        console.log('Jobs set:', result.data);
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

  const createImportJob = useCallback(async (type: string, criteria: Record<string, any>) => {
    try {
      setIsLoading(true);
      console.log('Creating import job:', { type, criteria });
      
      const result = await callSunskyAPI('createImportJob', { type, criteria });
      console.log('Import job creation result:', result);
      
      if (result.result === 'success') {
        toast({
          title: "Success",
          description: "Import job created successfully"
        });
        
        // Start the job immediately
        console.log('Starting import job:', result.data.id);
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
  }, [callSunskyAPI, toast, fetchJobs]);

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
    fetchJobs,
    getJobStatus
  };
};