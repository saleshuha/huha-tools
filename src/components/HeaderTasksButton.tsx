import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { useBackgroundTasks } from "@/contexts/BackgroundTasksContext";

interface HeaderTasksButtonProps {
  onClick: () => void;
}

export function HeaderTasksButton({ onClick }: HeaderTasksButtonProps) {
  const { activeTasks } = useBackgroundTasks();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="flex items-center gap-2 relative"
    >
      <Activity className="h-4 w-4" />
      Tasks
      {activeTasks.length > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {activeTasks.length}
        </Badge>
      )}
    </Button>
  );
}
