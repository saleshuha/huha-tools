import { CheckCircle2, XCircle, Printer, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  success: boolean;
  identifier: string;
  destination: string;
  quantity: number;
  printed: boolean;
  timestamp: Date;
  error?: string;
  template_type?: 'po' | 'inventory';
  country?: string;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  onReprint?: (activity: ActivityItem) => void;
  onViewDetails?: (activity: ActivityItem) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function RecentActivityFeed({ 
  activities, 
  onReprint, 
  onViewDetails,
  onLoadMore,
  hasMore,
  isLoading 
}: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No activity yet. Start scanning items to see results here.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`p-4 rounded-lg border transition-all ${
              activity.success
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-destructive/5 border-destructive/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-1">
                {activity.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {activity.identifier}
                  </span>
                  {activity.country && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary">
                      {activity.country}
                    </span>
                  )}
                  {activity.success && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm text-primary font-medium">
                        {activity.destination}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({activity.quantity} {activity.quantity === 1 ? 'unit' : 'units'})
                      </span>
                    </>
                  )}
                </div>

                {activity.error && (
                  <p className="text-sm text-destructive mt-1">{activity.error}</p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                  {activity.printed && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Printer className="w-3 h-3" />
                      Printed
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {activity.success && (
                <div className="flex gap-1 flex-shrink-0">
                  {onReprint && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReprint(activity)}
                      title="Reprint label"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  )}
                  {onViewDetails && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetails(activity)}
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Load More Button */}
        {hasMore && onLoadMore && (
          <div className="p-4 text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More History'}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
