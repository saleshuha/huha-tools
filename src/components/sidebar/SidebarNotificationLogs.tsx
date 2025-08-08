import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NotificationLog {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  timestamp: Date;
  read: boolean;
}

export function SidebarNotificationLogs() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const { toasts } = useToast();

  // Convert toasts to temporary notifications that auto-dismiss
  useEffect(() => {
    toasts.forEach(toast => {
      if (!notifications.find(n => n.id === toast.id)) {
        const newNotification: NotificationLog = {
          id: toast.id,
          title: String(toast.title || 'Notification'),
          description: String(toast.description || ''),
          variant: toast.variant || 'default',
          timestamp: new Date(),
          read: false
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== toast.id));
        }, 5000);
      }
    });
  }, [toasts]);

  const unreadCount = notifications.length; // All current notifications are "active"

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (variant?: string) => {
    switch (variant) {
      case 'destructive':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mb-3">
      {notifications.length > 0 && (
        <div className="bg-card border rounded-lg shadow-sm animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-2 border-b bg-muted/50 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-3 w-3" />
                <span className="text-xs font-medium">Live Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="h-4 w-4 p-0 text-xs flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={clearNotifications}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Current Active Notification - Single Full Display */}
          <div className="p-3">
            {notifications.slice(0, 1).map((notification, index) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border transition-all animate-fade-in ${
                  notification.variant === 'destructive' 
                    ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                    : notification.variant === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-background border-border shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.variant)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1">
                      {notification.title}
                    </p>
                    {notification.description && (
                      <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                        {notification.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Auto-dismiss in 5s
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length > 1 && (
              <div className="text-center mt-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  +{notifications.length - 1} more in queue
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}