import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useBackgroundTasks } from '@/contexts/BackgroundTasksContext';
import { BackgroundTasksPanel } from './BackgroundTasksPanel';

export function FloatingProgressIndicator() {
  const { activeTasks, tasks } = useBackgroundTasks();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  if (activeTasks.length === 0 && tasks.filter(t => t.status === 'completed' || t.status === 'error').length === 0) {
    return null;
  }

  const currentTask = activeTasks[0];
  const hasMoreTasks = activeTasks.length > 1;
  const recentCompletedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'error').slice(-3);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 max-w-sm">
        <Card className="shadow-lg border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">
                  {activeTasks.length > 0 ? 'Processing...' : 'Recent Tasks'}
                </span>
                {hasMoreTasks && (
                  <Badge variant="secondary" className="text-xs">
                    +{activeTasks.length - 1} more
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPanel(true)}
                  className="h-6 w-6 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-3">
                {/* Current/Active Task */}
                {currentTask && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="truncate">{currentTask.name}</span>
                      <span>{currentTask.processedItems}/{currentTask.totalItems}</span>
                    </div>
                    <Progress value={currentTask.progress} className="h-2" />
                    
                    {/* Show detailed progress from metadata */}
                    {currentTask.metadata?.currentStatus && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {currentTask.metadata.currentStatus}
                      </p>
                    )}
                    
                    {/* Thread indicators */}
                    {currentTask.threads && currentTask.threads.length > 1 && (
                      <div className="flex gap-1 mt-2">
                        {currentTask.threads.map(thread => (
                          <div key={thread.id} className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span>T{thread.id + 1}</span>
                              <span>{thread.processed}/{thread.total}</span>
                            </div>
                            <Progress value={thread.progress} className="h-1" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent completed tasks (when no active tasks) */}
                {activeTasks.length === 0 && recentCompletedTasks.length > 0 && (
                  <div className="space-y-2">
                    {recentCompletedTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{task.name}</span>
                        <Badge 
                          variant={task.status === 'completed' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {task.status === 'completed' ? '✓' : '✗'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-center">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowPanel(true)}
                    className="text-xs h-6 p-0"
                  >
                    View All Tasks
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BackgroundTasksPanel 
        isOpen={showPanel} 
        onClose={() => setShowPanel(false)} 
      />
    </>
  );
}