import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutomationRun {
  id: string;
  user_id: string;
  config_id?: string;
  site_origin?: string;
  status: 'queued' | 'running' | 'success' | 'error';
  started_at: string;
  finished_at?: string;
  result?: any;
  error?: string;
}

export const useAutomationRuns = () => {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRuns = async (limit = 50) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setRuns((data || []) as AutomationRun[]);
    } catch (error) {
      console.error('Error fetching automation runs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automation runs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRun = async (configId?: string, siteOrigin?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('automation_runs')
        .insert({
          user_id: user.user.id,
          config_id: configId,
          site_origin: siteOrigin,
          status: 'queued'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchRuns();
      toast({
        title: "Automation Started",
        description: "New automation run has been queued"
      });

      return data;
    } catch (error) {
      console.error('Error creating automation run:', error);
      toast({
        title: "Error",
        description: "Failed to start automation run",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateRunStatus = async (
    id: string, 
    status: AutomationRun['status'], 
    result?: any, 
    error?: string
  ) => {
    try {
      const updateData: any = {
        status,
        finished_at: status === 'success' || status === 'error' ? new Date().toISOString() : null
      };

      if (result) updateData.result = result;
      if (error) updateData.error = error;

      const { data, error: updateError } = await supabase
        .from('automation_runs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchRuns();
      return data;
    } catch (error) {
      console.error('Error updating automation run:', error);
      toast({
        title: "Error",
        description: "Failed to update automation run status",
        variant: "destructive"
      });
      throw error;
    }
  };

  const subscribeToRealTimeUpdates = () => {
    const channel = supabase
      .channel('automation_runs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_runs'
        },
        (payload) => {
          console.log('Automation run update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setRuns(prev => [payload.new as AutomationRun, ...prev.slice(0, 49)]);
          } else if (payload.eventType === 'UPDATE') {
            setRuns(prev => prev.map(run => 
              run.id === payload.new.id ? payload.new as AutomationRun : run
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getRunsByStatus = (status: AutomationRun['status']) => {
    return runs.filter(run => run.status === status);
  };

  const getRunStatistics = () => {
    const total = runs.length;
    const queued = getRunsByStatus('queued').length;
    const running = getRunsByStatus('running').length;
    const success = getRunsByStatus('success').length;
    const error = getRunsByStatus('error').length;

    return {
      total,
      queued,
      running,
      success,
      error,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0
    };
  };

  useEffect(() => {
    fetchRuns();
    const unsubscribe = subscribeToRealTimeUpdates();
    
    return unsubscribe;
  }, []);

  return {
    runs,
    isLoading,
    fetchRuns,
    createRun,
    updateRunStatus,
    getRunsByStatus,
    getRunStatistics,
  };
};