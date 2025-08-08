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

  // Convert toasts to persistent notification logs
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
        
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
      }
    });
  }, [toasts]);

  const unreadCount = notifications.filter(n => !n.read).length;

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
      <div className="bg-card border rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-3 border-b bg-muted/50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">Live Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={clearNotifications}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Notification Display Area */}
        <div className="p-2">
          <ScrollArea className="h-32">
            {notifications.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Bell className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No recent notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-2 rounded border text-xs transition-all ${
                      notification.read 
                        ? 'bg-muted/30 opacity-60 border-border/50' 
                        : 'bg-background border-border shadow-sm'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notification.variant)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium truncate text-xs">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        {notification.description && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {notification.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length > 3 && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={markAllAsRead}
                    >
                      +{notifications.length - 3} more
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}