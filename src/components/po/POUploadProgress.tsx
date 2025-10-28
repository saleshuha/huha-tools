import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface POUploadProgressProps {
  progress: number;
  status: string;
  currentPO?: string;
  currentItem?: string;
  stats: {
    totalRows: number;
    processed: number;
    inserted: number;
    updated: number;
    unchanged: number;
    invalid: number;
  };
  poProgress?: Array<{
    poNumber: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    itemsProcessed: number;
    totalItems: number;
  }>;
}

export function POUploadProgress({
  progress,
  status,
  currentPO,
  currentItem,
  stats,
  poProgress = []
}: POUploadProgressProps) {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Processing Purchase Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>

        {/* Current Processing */}
        {currentPO && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-semibold text-sm">Currently Processing:</span>
            </div>
            <div className="ml-6 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">PO Number:</span>
                <Badge variant="outline" className="font-mono">{currentPO}</Badge>
              </div>
              {currentItem && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Item:</span>
                  <span className="text-xs font-mono truncate max-w-[300px]">{currentItem}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.processed}
            </div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.inserted}
            </div>
            <div className="text-xs text-muted-foreground">New Items</div>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.updated}
            </div>
            <div className="text-xs text-muted-foreground">Updated</div>
          </div>
        </div>

        {/* Detailed PO Progress */}
        {poProgress.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">PO Processing Status</h4>
            <ScrollArea className="h-[200px] rounded-lg border bg-muted/20 p-3">
              <div className="space-y-2">
                {poProgress.map((po) => (
                  <div 
                    key={po.poNumber}
                    className={`p-2 rounded border transition-colors ${
                      po.status === 'completed' 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                        : po.status === 'processing'
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                        : po.status === 'error'
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                        : 'bg-background border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {po.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                        {po.status === 'processing' && (
                          <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                        )}
                        {po.status === 'pending' && (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        {po.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className="text-sm font-mono">{po.poNumber}</span>
                      </div>
                      <Badge 
                        variant={
                          po.status === 'completed' 
                            ? 'default' 
                            : po.status === 'processing'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {po.itemsProcessed}/{po.totalItems}
                      </Badge>
                    </div>
                    {po.status === 'processing' && po.totalItems > 0 && (
                      <Progress 
                        value={(po.itemsProcessed / po.totalItems) * 100} 
                        className="h-1 mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Additional Stats */}
        {stats.unchanged > 0 || stats.invalid > 0 ? (
          <div className="flex gap-2 text-xs">
            {stats.unchanged > 0 && (
              <Badge variant="secondary">
                {stats.unchanged} unchanged
              </Badge>
            )}
            {stats.invalid > 0 && (
              <Badge variant="destructive">
                {stats.invalid} invalid
              </Badge>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
