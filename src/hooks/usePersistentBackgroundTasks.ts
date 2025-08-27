import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PersistentTask {
  id: string;
  user_id: string;
  type: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  processed_items: number;
  total_items: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export function usePersistentBackgroundTasks() {
  const [tasks, setTasks] = useState<PersistentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('background_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Type the data properly
      const typedTasks: PersistentTask[] = (data || []).map(task => ({
        ...task,
        status: task.status === 'error' ? 'failed' : task.status as PersistentTask['status'],
        metadata: task.metadata || {}
      }));
      
      setTasks(typedTasks);
    } catch (error) {
      console.error('Failed to fetch background tasks:', error);
      toast({
        title: "Failed to Load Background Tasks",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('background_tasks')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'cancelled' as const, completed_at: new Date().toISOString() }
          : task
      ));

      toast({
        title: "Task Cancelled",
        description: "Background task has been cancelled",
      });
    } catch (error) {
      console.error('Failed to cancel task:', error);
      toast({
        title: "Failed to Cancel Task",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('background_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.filter(task => task.id !== taskId));

      toast({
        title: "Task Deleted",
        description: "Background task has been removed",
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Failed to Delete Task",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const downloadResult = async (task: PersistentTask) => {
    try {
      const filePath = task.metadata?.filePath;
      if (!filePath) {
        throw new Error('No file available for this task');
      }

      const { data, error } = await supabase.storage
        .from('exports')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath.split('/').pop() || `export-${task.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Export file download has started",
      });
    } catch (error) {
      console.error('Failed to download result:', error);
      toast({
        title: "Download Failed",
        description: error.message || 'Failed to download file',
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchTasks();

    // Subscribe to changes in background_tasks table
    const subscription = supabase
      .channel('background_tasks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'background_tasks'
        },
        (payload) => {
          console.log('Background task change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as PersistentTask, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task => 
              task.id === payload.new.id ? payload.new as PersistentTask : task
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const activeTasks = tasks.filter(task => task.status === 'processing');
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const failedTasks = tasks.filter(task => task.status === 'failed');

  return {
    tasks,
    activeTasks,
    completedTasks,
    failedTasks,
    loading,
    fetchTasks,
    cancelTask,
    deleteTask,
    downloadResult
  };
}