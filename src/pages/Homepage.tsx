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

interface Task {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'task' | 'meeting' | 'routine';
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

const Homepage = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Team standup',
      description: 'Daily sync with development team',
      date: new Date(),
      type: 'meeting',
      completed: false,
      priority: 'high'
    },
    {
      id: '2',
      title: 'Review inventory',
      description: 'Check monthly inventory data',
      date: new Date(),
      type: 'task',
      completed: false,
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Client call',
      description: 'Discuss project requirements',
      date: new Date(Date.now() + 86400000), // tomorrow
      type: 'meeting',
      completed: false,
      priority: 'high'
    }
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'task' as const,
    priority: 'medium' as const
  });

  const addTask = () => {
    if (!newTask.title.trim()) return;
    
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      date: selectedDate,
      type: newTask.type,
      completed: false,
      priority: newTask.priority
    };
    
    setTasks([...tasks, task]);
    setNewTask({ title: '', description: '', type: 'task', priority: 'medium' });
    setIsDialogOpen(false);
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => isSameDay(task.date, date));
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <MapPin className="h-3 w-3" />;
      case 'routine': return <Clock className="h-3 w-3" />;
      default: return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="min-h-screen bg-background ml-64">
      {/* Header */}
      <div className="p-6 border-b bg-white shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar & Tasks</h1>
          <p className="text-muted-foreground">Manage your daily tasks and schedule</p>
        </div>
      </div>

      {/* Selected Date Tasks (above calendar) */}
      {selectedDate && getTasksForDate(selectedDate).length > 0 && (
        <div className="p-6 bg-white border-b">
          <h3 className="text-lg font-semibold mb-4">
            Tasks for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {getTasksForDate(selectedDate).map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`
                  px-3 py-1 rounded-full text-sm cursor-pointer transition-all
                  ${task.completed ? 'line-through opacity-60' : ''}
                  ${getPriorityColor(task.priority)}
                `}
              >
                <div className="flex items-center gap-1">
                  {getTaskTypeIcon(task.type)}
                  <span>{task.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-4 text-center font-medium text-sm text-gray-600">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
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
                    min-h-[200px] p-4 border-r border-b cursor-pointer transition-colors hover:bg-gray-50
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                    ${isToday ? 'bg-blue-50' : ''}
                    ${isSelected ? 'bg-primary/10 border-primary' : ''}
                  `}
                >
                  {/* Date number */}
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium mb-2
                    ${isToday ? 'bg-blue-600 text-white' : ''}
                    ${isSelected && !isToday ? 'bg-primary text-primary-foreground' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>

                  {/* Tasks for this day */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(task.id);
                        }}
                        className={`
                          text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity
                          ${task.completed ? 'line-through opacity-60' : ''}
                          ${getPriorityColor(task.priority)}
                        `}
                      >
                        <div className="flex items-center gap-1">
                          {getTaskTypeIcon(task.type)}
                          <span className="truncate">{task.title}</span>
                        </div>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Task Creation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for {format(selectedDate, 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newTask.type} onValueChange={(value: any) => setNewTask({ ...newTask, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addTask}>Add Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Homepage;