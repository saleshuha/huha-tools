import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface BackgroundTask {
  id: string;
  type: 'sku-upload' | 'file-processing' | 'bulk-save';
  name: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  totalItems: number;
  processedItems: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  threads?: ThreadProgress[];
}

export interface ThreadProgress {
  id: number;
  progress: number;
  label: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  processed: number;
  total: number;
}

interface BackgroundTasksContextType {
  tasks: BackgroundTask[];
  activeTasks: BackgroundTask[];
  addTask: (task: Omit<BackgroundTask, 'id' | 'startTime'>) => string;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
  clearCompletedTasks: () => void;
  runBackgroundUpload: (
    skus: any[], 
    onAddSKUs: (skus: any[]) => Promise<void>,
    threadCount?: number,
    batchSize?: number
  ) => Promise<void>;
}

const BackgroundTasksContext = createContext<BackgroundTasksContextType | null>(null);

export function BackgroundTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const { toast } = useToast();
  const taskIdCounter = useRef(0);

  const addTask = useCallback((task: Omit<BackgroundTask, 'id' | 'startTime'>) => {
    const id = `task_${Date.now()}_${++taskIdCounter.current}`;
    const newTask: BackgroundTask = {
      ...task,
      id,
      startTime: new Date(),
    };
    
    setTasks(prev => [...prev, newTask]);
    return id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => prev.filter(task => 
      task.status !== 'completed' && task.status !== 'error'
    ));
  }, []);

  const activeTasks = tasks.filter(task => 
    task.status === 'pending' || task.status === 'processing'
  );

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

  return (
    <BackgroundTasksContext.Provider value={{
      tasks,
      activeTasks,
      addTask,
      updateTask,
      removeTask,
      clearCompletedTasks,
      runBackgroundUpload
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