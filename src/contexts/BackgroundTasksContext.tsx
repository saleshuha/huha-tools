import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface BackgroundTask {
  id: string;
  type: 'sku-upload' | 'file-processing' | 'bulk-save' | 'sunsky-export' | 'title-fetch';
  name: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  totalItems: number;
  processedItems: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  threads?: ThreadProgress[];
  canCancel?: boolean;
  metadata?: {
    exportType?: string;
    filters?: any;
    fileName?: string;
    fileSize?: number;
    exportHistoryId?: string;
    exportId?: string;
    filePath?: string;
  };
}

export interface ThreadProgress {
  id: number;
  progress: number;
  label: string;
  status: 'waiting' | 'processing' | 'completed' | 'error' | 'cancelled';
  processed: number;
  total: number;
  apiKey?: string;
  categoryId?: string;
}

interface BackgroundTasksContextType {
  tasks: BackgroundTask[];
  activeTasks: BackgroundTask[];
  addTask: (task: Omit<BackgroundTask, 'id' | 'startTime'>) => string;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
  cancelTask: (id: string) => void;
  clearCompletedTasks: () => void;
  isTaskCancelled: (taskId: string) => boolean;
  runBackgroundUpload: (
    skus: any[], 
    onAddSKUs: (skus: any[]) => Promise<void>,
    threadCount?: number,
    batchSize?: number
  ) => Promise<void>;
  runConcurrentExport: (
    config: any,
    onProgress: (progress: any) => void,
    onComplete: (results: any) => void
  ) => Promise<string>;
  runTitleFetch: (
    items: any[],
    onUpdate: (updates: any[]) => void
  ) => Promise<string>;
}

const BackgroundTasksContext = createContext<BackgroundTasksContextType | null>(null);

export function BackgroundTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const { toast } = useToast();
  const taskIdCounter = useRef(0);
  const cancellationFlags = useRef<Map<string, boolean>>(new Map());

  // Load persisted tasks from database on mount
  useEffect(() => {
    const loadPersistedTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load active tasks and recently completed tasks (last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data, error } = await supabase
          .from('background_tasks')
          .select('*')
          .eq('user_id', user.id)
          .or(`status.in.(processing,pending),and(status.in.(completed,error,cancelled),created_at.gte.${oneDayAgo.toISOString()})`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        if (data && data.length > 0) {
          const persistedTasks: BackgroundTask[] = data.map(dbTask => ({
            id: dbTask.id,
            type: dbTask.type as BackgroundTask['type'],
            name: `${dbTask.type} - ${(dbTask.metadata as any)?.exportType || 'Task'}`,
            progress: dbTask.progress || 0,
            status: dbTask.status as BackgroundTask['status'],
            totalItems: dbTask.total_items || 0,
            processedItems: dbTask.processed_items || 0,
            startTime: new Date(dbTask.created_at),
            endTime: dbTask.completed_at ? new Date(dbTask.completed_at) : undefined,
            canCancel: dbTask.status === 'processing' || dbTask.status === 'pending',
            metadata: (dbTask.metadata as any) || {}
          }));

          setTasks(persistedTasks);
        }
      } catch (error) {
        console.error('Failed to load persisted tasks:', error);
      }
    };

    loadPersistedTasks();
  }, []);

  const addTask = useCallback((task: Omit<BackgroundTask, 'id' | 'startTime'>) => {
    const id = `task_${Date.now()}_${++taskIdCounter.current}`;
    const newTask: BackgroundTask = {
      ...task,
      id,
      startTime: new Date(),
    };
    
    // Persist to database (async but don't wait)
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('background_tasks').insert({
            id: newTask.id,
            user_id: user.id,
            type: newTask.type,
            status: newTask.status,
            progress: newTask.progress,
            total_items: newTask.totalItems,
            processed_items: newTask.processedItems,
            metadata: newTask.metadata || {}
          });
        }
      } catch (error) {
        console.error('Failed to persist task to database:', error);
      }
    })();
    
    setTasks(prev => [...prev, newTask]);
    return id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));

    // Update database (async but don't wait)
    (async () => {
      try {
        const updateData: any = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.progress !== undefined) updateData.progress = updates.progress;
        if (updates.processedItems !== undefined) updateData.processed_items = updates.processedItems;
        if (updates.endTime) updateData.completed_at = updates.endTime.toISOString();
        if (updates.metadata) updateData.metadata = updates.metadata;

        await supabase
          .from('background_tasks')
          .update(updateData)
          .eq('id', id);
      } catch (error) {
        console.error('Failed to update task in database:', error);
      }
    })();
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
    cancellationFlags.current.delete(id);

    // Remove from database (async but don't wait)
    (async () => {
      try {
        await supabase.from('background_tasks').delete().eq('id', id);
      } catch (error) {
        console.error('Failed to remove task from database:', error);
      }
    })();
  }, []);

  const cancelTask = useCallback((id: string) => {
    cancellationFlags.current.set(id, true);
    updateTask(id, { 
      status: 'cancelled', 
      endTime: new Date(),
      error: 'Cancelled by user'
    });
  }, [updateTask]);

  const clearCompletedTasks = useCallback(() => {
    const completedTaskIds = tasks
      .filter(task => task.status === 'completed' || task.status === 'error')
      .map(task => task.id);

    setTasks(prev => prev.filter(task => 
      task.status !== 'completed' && task.status !== 'error'
    ));

    // Remove completed tasks from database (async but don't wait)
    if (completedTaskIds.length > 0) {
      (async () => {
        try {
          await supabase
            .from('background_tasks')
            .delete()
            .in('id', completedTaskIds);
        } catch (error) {
          console.error('Failed to remove completed tasks from database:', error);
        }
      })();
    }
  }, [tasks]);

  const activeTasks = tasks.filter(task => 
    task.status === 'pending' || task.status === 'processing'
  );

  // Helper function to check if task is cancelled
  const isTaskCancelled = useCallback((taskId: string) => {
    return cancellationFlags.current.get(taskId) === true;
  }, []);

  const runBackgroundUpload = useCallback(async (
    skus: any[], 
    onAddSKUs: (skus: any[]) => Promise<void>,
    threadCount = 4,
    batchSize = 1000
  ) => {
    const taskId = addTask({
      type: 'sku-upload',
      name: `Uploading ${skus.length} SKUs`,
      progress: 0,
      status: 'pending',
      totalItems: skus.length,
      processedItems: 0,
      threads: Array.from({ length: threadCount }, (_, i) => ({
        id: i,
        progress: 0,
        label: `Thread ${i + 1}: Ready`,
        status: 'waiting',
        processed: 0,
        total: 0
      }))
    });

    try {
      updateTask(taskId, { status: 'processing' });

      const chunkSize = Math.ceil(skus.length / threadCount);
      const chunks: any[][] = [];
      
      for (let i = 0; i < threadCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, skus.length);
        if (start < skus.length) {
          chunks.push(skus.slice(start, end));
        }
      }

      const processChunk = async (chunk: any[], threadIndex: number) => {
        const updateThreadProgress = (completed: number, total: number, label: string, status: ThreadProgress['status']) => {
          setTasks(prev => prev.map(task => {
            if (task.id === taskId && task.threads) {
              const updatedThreads = task.threads.map(thread => 
                thread.id === threadIndex 
                  ? { 
                      ...thread, 
                      progress: (completed / total) * 100,
                      label,
                      status,
                      processed: completed,
                      total
                    }
                  : thread
              );
              
              const totalProcessed = updatedThreads.reduce((acc, t) => acc + t.processed, 0);
              const overallProgress = (totalProcessed / skus.length) * 100;
              
              return {
                ...task,
                threads: updatedThreads,
                progress: overallProgress,
                processedItems: totalProcessed
              };
            }
            return task;
          }));
        };

        updateThreadProgress(0, chunk.length, `Thread ${threadIndex + 1}: Starting batch of ${chunk.length} SKUs...`, 'processing');

        try {
          // Process entire chunk at once for better performance
          await onAddSKUs(chunk);
          updateThreadProgress(chunk.length, chunk.length, `Thread ${threadIndex + 1}: Completed batch of ${chunk.length} SKUs!`, 'completed');
          return chunk.length;
        } catch (error) {
          console.warn(`Batch processing failed for thread ${threadIndex + 1}, trying smaller batches...`);
          updateThreadProgress(0, chunk.length, `Thread ${threadIndex + 1}: Processing smaller batches...`, 'processing');
          
          // If batch fails, try in smaller sub-batches
          const subBatchSize = Math.max(Math.floor(chunk.length / 4), 10); // Quarter size or minimum 10
          let processed = 0;
          
          for (let i = 0; i < chunk.length; i += subBatchSize) {
            const subBatch = chunk.slice(i, i + subBatchSize);
            try {
              await onAddSKUs(subBatch);
              processed += subBatch.length;
            } catch (subBatchError) {
              console.error(`Sub-batch failed in thread ${threadIndex + 1}:`, subBatchError);
              
              // Final fallback: individual processing
              for (const item of subBatch) {
                try {
                  await onAddSKUs([item]);
                  processed++;
                } catch (individualError) {
                  console.error(`Individual item failed in thread ${threadIndex + 1}:`, individualError);
                }
              }
            }
            updateThreadProgress(processed, chunk.length, `Thread ${threadIndex + 1}: ${processed}/${chunk.length} processed`, 'processing');
          }
          
          updateThreadProgress(chunk.length, chunk.length, `Thread ${threadIndex + 1}: Completed ${processed}/${chunk.length} SKUs`, 'completed');
          return processed;
        }
      };

      const threadPromises = chunks.map((chunk, index) => processChunk(chunk, index));
      const results = await Promise.all(threadPromises);
      const totalProcessed = results.reduce((sum, count) => sum + count, 0);

      updateTask(taskId, {
        status: 'completed',
        progress: 100,
        processedItems: totalProcessed,
        endTime: new Date()
      });

      toast({
        title: "Upload Completed",
        description: `Successfully processed ${totalProcessed}/${skus.length} SKUs`,
      });

    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date()
      });

      toast({
        title: "Upload Error",
        description: "Failed to process SKUs. Check the progress panel for details.",
        variant: "destructive"
      });
    }
  }, [addTask, updateTask, toast]);

  const runConcurrentExport = useCallback(async (
    config: any,
    onProgress: (progress: any) => void,
    onComplete: (results: any) => void
  ): Promise<string> => {
    const taskId = addTask({
      type: 'sunsky-export',
      name: `Concurrent Export - ${config.statusText || 'Products'}`,
      progress: 0,
      status: 'processing',
      totalItems: 0,
      processedItems: 0,
      canCancel: true,
      threads: config.apiKeys?.map((api: any, index: number) => ({
        id: index,
        progress: 0,
        label: `${api.name}: Waiting`,
        status: 'waiting',
        processed: 0,
        total: 0,
        apiKey: api.id,
        categoryId: config.categoryId?.toString()
      })) || [],
      metadata: {
        exportType: 'concurrent',
        filters: config,
        exportId: `export-${Date.now()}`
      }
    });

    try {
      // Import the concurrent export hook dynamically
      const { useConcurrentSunskyExport } = await import('@/hooks/useConcurrentSunskyExport');
      
      // Start the actual concurrent export
      // Note: This is a simplified approach. In practice, this should be handled
      // by the component that has access to the hook instance
      onProgress(taskId);
      
      // The component calling this function should handle the actual export
      // We return the taskId so the component can manage the export process
      return taskId;
    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date()
      });
      throw error;
    }
  }, [addTask, updateTask]);

  const runTitleFetch = useCallback(async (
    items: any[],
    onUpdate: (updates: any[]) => void
  ): Promise<string> => {
    const taskId = addTask({
      type: 'title-fetch',
      name: `Fetching titles for ${items.length} items from Sunsky`,
      progress: 0,
      status: 'processing',
      totalItems: items.length,
      processedItems: 0,
      canCancel: true
    });

    let processed = 0;
    const titleUpdates: any[] = [];

    try {
      // Process items in batches to avoid overwhelming the API
      const batchSize = 5;
      
      for (let i = 0; i < items.length; i += batchSize) {
        if (isTaskCancelled(taskId)) {
          updateTask(taskId, { 
            status: 'cancelled', 
            endTime: new Date(),
            error: 'Cancelled by user'
          });
          return taskId;
        }

        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(async (item) => {
          try {
            const { data, error } = await supabase.functions.invoke('sunsky-api', {
              body: { action: 'getProductDetails', skuCode: item.sku }
            });

            processed++;
            const progress = (processed / items.length) * 100;
            
            updateTask(taskId, { 
              progress,
              processedItems: processed
            });

            if (!error && data?.result === 'success' && data?.data?.name) {
              titleUpdates.push({
                asin: item.asin,
                title: data.data.name
              });
            }
          } catch (error) {
            console.error(`Failed to fetch title for SKU ${item.sku}:`, error);
            processed++;
            updateTask(taskId, { 
              progress: (processed / items.length) * 100,
              processedItems: processed
            });
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to be API-friendly
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update the inventory with fetched titles
      if (titleUpdates.length > 0) {
        await onUpdate(titleUpdates);
      }

      updateTask(taskId, {
        status: 'completed',
        progress: 100,
        processedItems: items.length,
        endTime: new Date()
      });

      toast({
        title: "Title Fetch Completed",
        description: `Successfully updated ${titleUpdates.length}/${items.length} titles from Sunsky`,
      });

    } catch (error) {
      updateTask(taskId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: new Date()
      });

      toast({
        title: "Title Fetch Error",
        description: "Failed to fetch titles from Sunsky. Check the progress panel for details.",
        variant: "destructive"
      });
    }

    return taskId;
  }, [addTask, updateTask, isTaskCancelled, toast]);

  return (
    <BackgroundTasksContext.Provider value={{
      tasks,
      activeTasks,
      addTask,
      updateTask,
      removeTask,
      cancelTask,
      clearCompletedTasks,
      runBackgroundUpload,
      runConcurrentExport,
      runTitleFetch,
      isTaskCancelled
    }}>
      {children}
    </BackgroundTasksContext.Provider>
  );
}

export function useBackgroundTasks() {
  const context = useContext(BackgroundTasksContext);
  if (!context) {
    throw new Error('useBackgroundTasks must be used within a BackgroundTasksProvider');
  }
  return context;
}