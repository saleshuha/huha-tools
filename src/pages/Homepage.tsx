import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle, Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useCountry } from "@/contexts/CountryContext";
import { HuhaHeader01 } from "@/components/ui/huha-header-01";
import { QZTrayStatus } from "@/components/QZTrayStatus";

interface LocalTask {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'task' | 'meeting' | 'routine';
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}
const Homepage = () => {
  const { selectedCountry } = useCountry();
  const { tasks: dbTasks, loading, addTask: addDbTask, updateTask, deleteTask: deleteDbTask } = useTasks();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'task' as const,
    priority: 'medium' as const
  });

  // Convert DB tasks to local format
  const tasks: LocalTask[] = dbTasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description || '',
    date: task.due_date ? new Date(task.due_date) : new Date(task.created_at),
    type: 'task' as const, // Since DB doesn't have type field, default to task
    completed: task.completed,
    priority: 'medium' as const // Since DB doesn't have priority field, default to medium
  }));
  const addTask = async () => {
    if (!newTask.title.trim()) return;
    
    await addDbTask({
      title: newTask.title,
      description: newTask.description || undefined,
      due_date: format(selectedDate, 'yyyy-MM-dd'),
      completed: false,
    });
    
    setNewTask({
      title: '',
      description: '',
      type: 'task',
      priority: 'medium'
    });
    setIsDialogOpen(false);
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, { completed: !task.completed });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteDbTask(taskId);
  };
  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => isSameDay(task.date, date));
  };
  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <MapPin className="h-3 w-3" />;
      case 'routine':
        return <Clock className="h-3 w-3" />;
      default:
        return <CheckCircle className="h-3 w-3" />;
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-success/10 text-success border-success/20';
    }
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  return <div className="min-h-screen bg-gradient-surface flex">
      {/* Reduced spacer for sidebar - calendar now uses more space */}
      <div className="w-16 flex-shrink-0"></div>
      
      {/* Main content - calendar now extends further left */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Country-specific Header */}
        <HuhaHeader01
          icon={<span className="text-2xl">{selectedCountry === 'UAE' ? '🇦🇪' : '🇸🇦'}</span>}
          title={selectedCountry === 'UAE' ? 'UAE Operations Dashboard' : 'KSA Operations Dashboard'}
          subtitle={selectedCountry === 'UAE' 
            ? 'Managing inventory and operations in the United Arab Emirates' 
            : 'Managing inventory and operations in Saudi Arabia'
          }
          className="flex-shrink-0 animate-slide-up"
        />

        {/* Enhanced Selected Date Tasks */}
        {selectedDate && getTasksForDate(selectedDate).length > 0 && <div className="glass-container p-6 mx-6 mb-2 flex-shrink-0 animate-slide-up">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">
              Tasks for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="flex flex-wrap gap-3">
              {getTasksForDate(selectedDate).map(task => <div key={task.id} className={`
                    px-4 py-2 rounded-lg text-sm transition-all duration-300 
                    hover:scale-105 hover:shadow-medium flex items-center gap-2 relative group/task
                    ${task.completed ? 'line-through opacity-60' : 'shadow-soft'}
                    ${getPriorityColor(task.priority)}
                  `}>
                  <div onClick={() => toggleTask(task.id)} className="flex items-center gap-2 cursor-pointer flex-1">
                    {getTaskTypeIcon(task.type)}
                    <span className="font-medium">{task.title}</span>
                  </div>
                  {/* Delete button for tasks in header */}
                  <button onClick={() => handleDeleteTask(task.id)} className="w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover/task:opacity-100 transition-opacity duration-200 hover:scale-110 ml-2" title="Delete task">
                    ×
                  </button>
                </div>)}
            </div>
          </div>}

        {/* QZ Tray Status Panel */}
        <div className="mx-6 mb-4 flex-shrink-0">
          <QZTrayStatus />
        </div>

        {/* Enhanced Calendar */}
        <div className="flex-1 p-4 overflow-hidden">
          {/* Calendar Header */}
          <div className="glass-container p-4 mb-4 bg-card animate-fade-in mx-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-card-foreground bg-gradient-primary bg-clip-text text-transparent">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth} className="hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth} className="hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Calendar Grid with proper height */}
          <div className="glass-container overflow-hidden flex flex-col animate-fade-in-scale" style={{
            height: 'calc(100vh - 300px)',
            minHeight: '700px'
          }}>
            {/* Enhanced Days of week header */}
            <div className="grid grid-cols-7 border-b border-border bg-gradient-primary flex-shrink-0">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                <div key={day} className="p-3 text-center font-semibold text-primary-foreground">
                  <div className="hidden sm:block">{day}</div>
                  <div className="sm:hidden">{day.slice(0, 3)}</div>
                </div>
              ))}
            </div>

            {/* Enhanced Calendar Days with fixed grid structure */}
            <div className="grid grid-cols-7 flex-1" style={{ 
              display: 'grid',
              gridTemplateRows: `repeat(${Math.ceil(calendarDays.length / 7)}, 1fr)`,
              minHeight: '600px'
            }}>
              {calendarDays.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                
                return (
                  <div 
                    key={index} 
                    onClick={() => {
                      setSelectedDate(day);
                      setIsDialogOpen(true);
                    }} 
                    className={`
                      p-2 border-r border-b border-border cursor-pointer transition-all duration-300 
                      flex flex-col hover:bg-accent/20 hover:scale-[1.01] group relative overflow-hidden
                      ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-card'}
                      ${isToday ? 'bg-gradient-accent ring-2 ring-accent/30' : ''}
                      ${isSelected ? 'bg-primary/20 ring-2 ring-primary border-primary' : ''}
                    `}
                    style={{ minHeight: '100px' }}
                  >
                    {/* Date number */}
                    <div className={`
                      w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 
                      flex-shrink-0 transition-all duration-300 group-hover:scale-110
                      ${isToday ? 'bg-accent text-accent-foreground shadow-medium' : ''}
                      ${isSelected && !isToday ? 'bg-primary text-primary-foreground shadow-soft' : ''}
                      ${!isToday && !isSelected ? 'group-hover:bg-muted' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>

                    {/* Tasks for this day */}
                    <div className="space-y-0.5 flex-1 overflow-hidden">
                      {dayTasks.slice(0, 2).map((task, taskIndex) => (
                        <div 
                          key={task.id} 
                          className={`
                            text-xs p-1 rounded border cursor-pointer transition-all duration-300
                            hover:scale-105 transform group/task relative
                            ${task.completed ? 'line-through opacity-60' : ''}
                            ${getPriorityColor(task.priority)}
                          `}
                          style={{ animationDelay: `${taskIndex * 100}ms` }}
                        >
                          <div 
                            className="flex items-center gap-1" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(task.id);
                            }}
                          >
                            {getTaskTypeIcon(task.type)}
                            <span className="truncate text-xs flex-1 leading-none">{task.title}</span>
                          </div>
                          
                          {/* Delete button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }} 
                            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover/task:opacity-100 transition-opacity duration-200 hover:scale-110 text-xs" 
                            title="Delete task"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-muted-foreground font-medium px-1 py-0.5 rounded bg-muted/50 text-center">
                          +{dayTasks.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enhanced Task Creation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] glass-container">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Add New Task
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-base">
                Create a new task for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-3">
                <Label htmlFor="title" className="text-sm font-semibold text-foreground">Title</Label>
                <Input id="title" value={newTask.title} onChange={e => setNewTask({
                ...newTask,
                title: e.target.value
              })} placeholder="What needs to be done?" className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
                <Textarea id="description" value={newTask.description} onChange={e => setNewTask({
                ...newTask,
                description: e.target.value
              })} placeholder="Add more details about your task..." rows={3} className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="type" className="text-sm font-semibold text-foreground">Type</Label>
                  <Select value={newTask.type} onValueChange={(value: any) => setNewTask({
                  ...newTask,
                  type: value
                })}>
                    <SelectTrigger className="transition-all duration-300 hover:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task" className="cursor-pointer hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Task
                        </div>
                      </SelectItem>
                      <SelectItem value="meeting" className="cursor-pointer hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Meeting
                        </div>
                      </SelectItem>
                      <SelectItem value="routine" className="cursor-pointer hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Routine
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="priority" className="text-sm font-semibold text-foreground">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({
                  ...newTask,
                  priority: value
                })}>
                    <SelectTrigger className="transition-all duration-300 hover:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="cursor-pointer hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-success"></div>
                          Low Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="medium" className="cursor-pointer hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-warning"></div>
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="high" className="cursor-pointer hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-destructive"></div>
                          High Priority
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="transition-all duration-300 hover:scale-105">
                Cancel
              </Button>
              <Button onClick={addTask} className="bg-gradient-primary hover:shadow-medium transition-all duration-300 hover:scale-105">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};
export default Homepage;