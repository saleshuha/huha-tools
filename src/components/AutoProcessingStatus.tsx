import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { NoonOrder } from '@/hooks/useNoonOrders';

interface AutoProcessingStatusProps {
  orders: NoonOrder[];
}

interface ProcessingStats {
  uploaded: number;
  readyForSunsky: number;
  placed: number;
  exceptions: number;
  total: number;
}

export function AutoProcessingStatus({ orders }: AutoProcessingStatusProps) {
  const [stats, setStats] = useState<ProcessingStats>({
    uploaded: 0,
    readyForSunsky: 0,
    placed: 0,
    exceptions: 0,
    total: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const newStats = {
      uploaded: orders.filter(o => !o.order_status || o.order_status === 'uploaded').length,
      readyForSunsky: orders.filter(o => o.order_status === 'ready_for_sunsky').length,
      placed: orders.filter(o => o.sunsky_order_number && !o.sunsky_tracking_number).length,
      exceptions: orders.filter(o => o.order_status === 'exception' || o.sunsky_error_message).length,
      total: orders.length
    };

    const hasChanges = JSON.stringify(newStats) !== JSON.stringify(stats);
    if (hasChanges) {
      setIsProcessing(true);
      setLastUpdate(Date.now());
      
      // Simulate processing time
      setTimeout(() => setIsProcessing(false), 2000);
    }

    setStats(newStats);
  }, [orders]);

  const processingCount = stats.uploaded + stats.readyForSunsky + stats.placed;
  const completedCount = stats.total - processingCount - stats.exceptions;
  const progressPercent = stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;

  if (stats.total === 0) return null;

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/5 via-background to-accent/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Auto-Processing Pipeline</h3>
            {isProcessing && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Processing Progress</span>
              <span className="font-mono">{completedCount}/{stats.total} orders</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Processing Stages */}
          <div className="flex flex-wrap gap-2">
            {stats.uploaded > 0 && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {stats.uploaded} Validating
                </Badge>
                {stats.readyForSunsky > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            )}
            
            {stats.readyForSunsky > 0 && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {stats.readyForSunsky} Placing
                </Badge>
                {stats.placed > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            )}
            
            {stats.placed > 0 && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {stats.placed} Syncing
                </Badge>
              </div>
            )}
            
            {completedCount > 0 && (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {completedCount} Completed
              </Badge>
            )}
            
            {stats.exceptions > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.exceptions} Exceptions
              </Badge>
            )}
          </div>

          {/* Status Messages */}
          {processingCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {stats.uploaded > 0 && "🔄 Auto-validating uploaded orders..."}
              {stats.readyForSunsky > 0 && "🚀 Auto-placing orders with Sunsky..."}
              {stats.placed > 0 && "📡 Auto-syncing order status from Sunsky..."}
            </div>
          )}

          {processingCount === 0 && stats.exceptions === 0 && completedCount > 0 && (
            <div className="text-xs text-success flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              All orders processed successfully - no manual intervention needed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}