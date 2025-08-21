import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type POUploadJobRow = Database['public']['Tables']['po_upload_jobs']['Row'];
type POUploadJobInsert = Database['public']['Tables']['po_upload_jobs']['Insert'];
type POUploadJobErrorRow = Database['public']['Tables']['po_upload_job_errors']['Row'];

export interface POUploadJob extends Omit<POUploadJobRow, 'processing_details'> {
  processing_details: Record<string, any>;
}

export interface POUploadJobError extends Omit<POUploadJobErrorRow, 'row_data'> {
  row_data?: Record<string, any>;
}

export const usePOUploadJobs = () => {
  const [jobs, setJobs] = useState<POUploadJob[]>([]);
  const [currentJob, setCurrentJob] = useState<POUploadJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('po_upload_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedJobs = (data || []).map(job => ({
        ...job,
        processing_details: job.processing_details as Record<string, any>
      })) as POUploadJob[];
      
      setJobs(transformedJobs);
    } catch (error) {
      console.error('Error fetching upload jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch upload jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createJob = useCallback(async (
    fileName: string,
    fileSize?: number,
    totalRows?: number
  ): Promise<POUploadJob | null> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('po_upload_jobs')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_size: fileSize,
          total_rows: totalRows,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      const newJob = {
        ...data,
        processing_details: data.processing_details as Record<string, any>
      } as POUploadJob;
      
      setJobs(prev => [newJob, ...prev]);
      setCurrentJob(newJob);
      
      return newJob;
    } catch (error) {
      console.error('Error creating upload job:', error);
      toast({
        title: "Error", 
        description: "Failed to create upload job",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const updateJob = useCallback(async (
    jobId: string, 
    updates: Partial<POUploadJob>
  ) => {
    try {
      const { data, error } = await supabase
        .from('po_upload_jobs')
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;

      const updatedJob = data as POUploadJob;
      setJobs(prev => prev.map(job => 
        job.id === jobId ? updatedJob : job
      ));
      
      if (currentJob?.id === jobId) {
        setCurrentJob(updatedJob);
      }

      return updatedJob;
    } catch (error) {
      console.error('Error updating upload job:', error);
      toast({
        title: "Error",
        description: "Failed to update upload job",
        variant: "destructive",
      });
      return null;
    }
  }, [currentJob, toast]);

  const getJobErrors = useCallback(async (jobId: string): Promise<POUploadJobError[]> => {
    try {
      const { data, error } = await supabase
        .from('po_upload_job_errors')
        .select('*')
        .eq('job_id', jobId)
        .order('row_number', { ascending: true });

      if (error) throw error;
      
      const transformedErrors = (data || []).map(error => ({
        ...error,
        row_data: error.row_data as Record<string, any> | undefined
      })) as POUploadJobError[];
      
      return transformedErrors;
    } catch (error) {
      console.error('Error fetching job errors:', error);
      return [];
    }
  }, []);

  const cancelJob = useCallback(async (jobId: string) => {
    return updateJob(jobId, { 
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });
  }, [updateJob]);

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('po_upload_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      setJobs(prev => prev.filter(job => job.id !== jobId));
      if (currentJob?.id === jobId) {
        setCurrentJob(null);
      }

      toast({
        title: "Success",
        description: "Upload job deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting upload job:', error);
      toast({
        title: "Error",
        description: "Failed to delete upload job",
        variant: "destructive",
      });
    }
  }, [currentJob, toast]);

  // Real-time subscription to job updates
  const subscribeToJob = useCallback((jobId: string, onUpdate: (job: POUploadJob) => void) => {
    const subscription = supabase
      .channel(`po_upload_job_${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'po_upload_jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        const updatedJob = payload.new as POUploadJob;
        onUpdate(updatedJob);
        setJobs(prev => prev.map(job => 
          job.id === jobId ? updatedJob : job
        ));
        if (currentJob?.id === jobId) {
          setCurrentJob(updatedJob);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentJob]);

  return {
    jobs,
    currentJob,
    isLoading,
    fetchJobs,
    createJob,
    updateJob,
    getJobErrors,
    cancelJob,
    deleteJob,
    subscribeToJob,
    setCurrentJob
  };
};