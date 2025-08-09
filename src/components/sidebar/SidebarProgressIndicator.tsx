import { useBackgroundTasks } from "@/contexts/BackgroundTasksContext"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react"

export function SidebarProgressIndicator() {
  const { activeTasks, tasks } = useBackgroundTasks()
  
  // Show active tasks
  const activeTask = activeTasks?.[0]
  
  // If no active tasks, show recent completed/error tasks
  const recentTasks = tasks
    .filter(task => task.status === 'completed' || task.status === 'error')
    .slice(0, 2)
  
  // Don't show anything if no relevant tasks
  if (!activeTask && recentTasks.length === 0) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500/10 text-blue-600 border-blue-200'
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-200'
      case 'error':
        return 'bg-red-500/10 text-red-600 border-red-200'
      default:
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-200'
    }
  }

  return (
    <div className="space-y-2 p-3 border border-sidebar-border rounded-lg bg-sidebar-accent/5">
      {/* Active Task */}
      {activeTask && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(activeTask.status)}
            <span className="text-xs font-medium text-sidebar-foreground truncate">
              {activeTask.name}
            </span>
          </div>
          
          {activeTask.progress !== undefined && (
            <div className="space-y-1">
              <Progress 
                value={activeTask.progress} 
                className="h-1.5 bg-sidebar-border"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-sidebar-foreground/60">
                  {Math.round(activeTask.progress)}%
                </span>
                {activeTask.threads && activeTask.threads.length > 0 && (
                  <span className="text-[10px] text-sidebar-foreground/60">
                    {activeTask.threads.length} threads
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Tasks */}
      {!activeTask && recentTasks.length > 0 && (
        <div className="space-y-1">
          {recentTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <span className="text-xs text-sidebar-foreground/80 truncate flex-1">
                {task.name}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1 py-0 h-4 ${getStatusColor(task.status)}`}
              >
                {task.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}