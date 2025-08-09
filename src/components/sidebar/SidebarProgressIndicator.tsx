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

  return null; // Sidebar progress indicator removed - using in-page status panel instead
}