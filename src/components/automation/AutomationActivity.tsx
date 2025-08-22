import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, Play, Pause, Square } from 'lucide-react';
import { useAutomationRuns } from '@/hooks/useAutomationRuns';
import { useAutomationCapture } from '@/hooks/useAutomationCapture';
import { formatDistanceToNow } from 'date-fns';

export const AutomationActivity = () => {
  const { runs, getRunStatistics, createRun } = useAutomationRuns();
  const { captureEvents } = useAutomationCapture();
  
  const stats = getRunStatistics();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Running</p>
                <p className="text-2xl font-bold">{stats.running}</p>
              </div>
              <Play className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Elements Captured</p>
                <p className="text-2xl font-bold">{captureEvents.length}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate Progress */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Success Rate Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span>{stats.successRate}%</span>
              </div>
              <Progress value={stats.successRate} className="h-2" />
              <div className="grid grid-cols-4 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Success: {stats.success}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Failed: {stats.error}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Running: {stats.running}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Queued: {stats.queued}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Tabs */}
      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runs">Automation Runs</TabsTrigger>
          <TabsTrigger value="captures">Recent Captures</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Automation Runs</CardTitle>
                  <CardDescription>
                    Track the status and progress of your automation executions
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => createRun(undefined, 'https://noon.partners')}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Test Run
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    No automation runs yet. Start your first automation run to see activity here.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {runs.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(run.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {run.site_origin || 'Unknown Site'}
                              </span>
                              <Badge className={getStatusColor(run.status)}>
                                {run.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Started {formatDistanceToNow(new Date(run.started_at))} ago
                            </p>
                            {run.error && (
                              <p className="text-sm text-red-600 mt-1">
                                Error: {run.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            Duration: {run.finished_at 
                              ? `${Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                              : 'Running...'
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="captures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Element Captures</CardTitle>
              <CardDescription>
                Elements captured by the browser extension in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {captureEvents.length === 0 ? (
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    No elements captured yet. Install the browser extension and start capturing elements from live webpages.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {captureEvents.slice(0, 20).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{event.tag}</Badge>
                            {event.mapped_field && (
                              <Badge className="bg-green-100 text-green-800">
                                Mapped to {event.mapped_field}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">CSS:</span>{' '}
                              <code className="bg-muted px-1 rounded text-xs">
                                {event.css}
                              </code>
                            </div>
                            {event.inner_text && (
                              <div>
                                <span className="font-medium">Text:</span>{' '}
                                <span className="text-muted-foreground">
                                  {event.inner_text.slice(0, 50)}
                                  {event.inner_text.length > 50 ? '...' : ''}
                                </span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              From: {event.site_origin} • {formatDistanceToNow(new Date(event.created_at))} ago
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};