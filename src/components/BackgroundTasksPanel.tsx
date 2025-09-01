import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Activity,
  Trash2
} from 'lucide-react';
import { useBackgroundTasks, BackgroundTask, ThreadProgress } from '@/contexts/BackgroundTasksContext';
import { usePersistentBackgroundTasks } from '@/hooks/usePersistentBackgroundTasks';
import { BackgroundExportDownloadButton } from './BackgroundExportDownloadButton';
import { formatDistanceToNow } from 'date-fns';

interface BackgroundTasksPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackgroundTasksPanel({ isOpen, onClose }: BackgroundTasksPanelProps) {
  const { tasks, activeTasks, removeTask, cancelTask, clearCompletedTasks } = useBackgroundTasks();
  const { 
    tasks: persistentTasks, 
    activeTasks: persistentActiveTasks, 
    completedTasks: persistentCompletedTasks,
    failedTasks: persistentFailedTasks,
    cancelTask: cancelPersistentTask,
    deleteTask: deletePersistentTask,
    downloadResult
  } = usePersistentBackgroundTasks();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  // Combine both types of tasks - map persistent task statuses to BackgroundTask statuses
  const mapPersistentStatus = (status: string): BackgroundTask['status'] => {
    switch (status) {
      case 'queued': return 'pending';
      case 'processing': return 'processing';
      case 'completed': return 'completed';
      case 'failed': return 'error';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  };

  const persistentTasksAsBackground = persistentTasks.map(t => ({
    id: t.id,
    name: t.type === 'sunsky_export' ? 'Sunsky Background Export' : t.type,
    status: mapPersistentStatus(t.status),
    progress: t.progress,
    processedItems: t.processed_items,
    totalItems: t.total_items,
    threads: [] as ThreadProgress[],
    startTime: new Date(t.created_at),
    endTime: t.completed_at ? new Date(t.completed_at) : undefined,
    canCancel: ['processing', 'queued'].includes(t.status),
    metadata: t.metadata || {},
    isPersistent: true
  } as BackgroundTask & { isPersistent: boolean }));
  
  const allTasks = [...tasks, ...persistentTasksAsBackground];
  const allActiveTasks = allTasks.filter(t => t.status === 'processing' || t.status === 'pending');


  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: BackgroundTask['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: BackgroundTask['status']) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'secondary',
      error: 'destructive',
      cancelled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status] || 'secondary'} className="ml-2">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getThreadStatusColor = (status: ThreadProgress['status']) => {
    switch (status) {
      case 'waiting':
        return 'bg-gray-200';
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-400';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Background Tasks</CardTitle>
          <div className="flex items-center gap-2">
            {allTasks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompletedTasks}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Completed
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          {allTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No background tasks running
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {/* Active Tasks */}
                {allActiveTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Active Tasks ({allActiveTasks.length})
                    </h3>
                    {allActiveTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isExpanded={expandedTasks.has(task.id)}
                        onToggleExpand={() => toggleTaskExpansion(task.id)}
                        onRemove={() => {
                          if ((task as any).isPersistent) {
                            deletePersistentTask(task.id);
                          } else {
                            removeTask(task.id);
                          }
                        }}
                        onCancel={task.canCancel ? () => {
                          if ((task as any).isPersistent) {
                            cancelPersistentTask(task.id);
                          } else {
                            cancelTask(task.id);
                          }
                        } : undefined}
                        getStatusIcon={getStatusIcon}
                        getStatusBadge={getStatusBadge}
                        getThreadStatusColor={getThreadStatusColor}
                      />
                    ))}
                  </div>
                )}

                {/* Completed/Error Tasks */}
                {allTasks.filter(t => t.status === 'completed' || t.status === 'error').length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Recent Tasks
                    </h3>
                    {allTasks
                      .filter(t => t.status === 'completed' || t.status === 'error')
                      .slice(-5)
                      .map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isExpanded={expandedTasks.has(task.id)}
                          onToggleExpand={() => toggleTaskExpansion(task.id)}
                          onRemove={() => {
                            if ((task as any).isPersistent) {
                              deletePersistentTask(task.id);
                            } else {
                              removeTask(task.id);
                            }
                          }}
                          onCancel={task.canCancel ? () => {
                            if ((task as any).isPersistent) {
                              cancelPersistentTask(task.id);
                            } else {
                              cancelTask(task.id);
                            }
                          } : undefined}
                          getStatusIcon={getStatusIcon}
                          getStatusBadge={getStatusBadge}
                          getThreadStatusColor={getThreadStatusColor}
                        />
                      ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskCardProps {
  task: BackgroundTask;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onCancel?: () => void;
  getStatusIcon: (status: BackgroundTask['status']) => React.ReactNode;
  getStatusBadge: (status: BackgroundTask['status']) => React.ReactNode;
  getThreadStatusColor: (status: ThreadProgress['status']) => string;
}

function TaskCard({ 
  task, 
  isExpanded, 
  onToggleExpand, 
  onRemove,
  onCancel,
  getStatusIcon,
  getStatusBadge,
  getThreadStatusColor
}: TaskCardProps) {
  return (
    <Card className="mb-3">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(task.status)}
                <div>
                  <h4 className="font-medium">{task.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {task.processedItems}/{task.totalItems} items
                    {task.endTime && (
                      <span className="ml-2">
                        • Completed {formatDistanceToNow(task.endTime)} ago
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(task.status)}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
            <Progress value={task.progress} className="mt-2" />
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {task.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">{task.error}</p>
              </div>
            )}
            
            {task.threads && task.threads.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Thread Progress:</h5>
                {task.threads.map(thread => (
                  <div key={thread.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                    <div 
                      className={`w-3 h-3 rounded-full ${getThreadStatusColor(thread.status)}`}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{thread.label}</span>
                        <span>{thread.processed}/{thread.total}</span>
                      </div>
                      <Progress value={thread.progress} className="mt-1 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Started: {task.startTime.toLocaleString()}
                {task.endTime && (
                  <span className="ml-4">
                    Duration: {Math.round((task.endTime.getTime() - task.startTime.getTime()) / 1000)}s
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {/* Download button for completed export tasks */}
                {task.status === 'completed' && 
                 (task.metadata as any)?.downloadableResults && 
                 (task.name.includes('Export') || task.name.includes('export')) && (
                  <BackgroundExportDownloadButton 
                    taskId={task.id}
                    taskMetadata={task.metadata}
                    size="sm"
                  />
                )}
                {onCancel && task.status === 'processing' && (
                  <Button variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onRemove}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}