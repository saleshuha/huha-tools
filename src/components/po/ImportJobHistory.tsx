import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Eye, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ImportJob {
  id: string;
  type: string;
  status: string;
  country: string;
  created_at: string;
  completed_at: string | null;
  total_items: number;
  processed_items: number;
  success_count: number;
  error_count: number;
  criteria: any;
  result_summary: any;
}

interface ImportJobItem {
  id: string;
  sku_code: string;
  model_number: string | null;
  status: string;
  details: any;
  created_at: string;
}

interface ImportJobHistoryProps {
  refreshTrigger?: number; // Used to trigger refresh from parent
}

export function ImportJobHistory({ refreshTrigger }: ImportJobHistoryProps) {
  const { profile } = useUserProfile();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
  const [jobItems, setJobItems] = useState<ImportJobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const loadJobs = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sunsky_import_jobs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading import jobs:', error);
      toast.error('Failed to load import history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();

    // Set up real-time subscription for job updates
    if (!profile?.id) return;

    const channel = supabase
      .channel('import-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'sunsky_import_jobs',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Job update received:', payload);
          // Reload jobs when any change occurs
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, refreshTrigger]); // Also refresh when refreshTrigger changes

  const loadJobDetails = async (job: ImportJob) => {
    setSelectedJob(job);
    setDetailsLoading(true);
    setShowDetailsDialog(true);
    
    try {
      const { data, error } = await supabase
        .from('sunsky_import_job_items')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobItems(data || []);
    } catch (error) {
      console.error('Error loading job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportJobDetails = () => {
    if (!selectedJob || jobItems.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = jobItems.map(item => ({
      'SKU Code': item.sku_code,
      'Model Number': item.model_number || 'N/A',
      'Status': item.status,
      'Product Name': item.details?.name || 'N/A',
      'Price': item.details?.price || 'N/A',
      'Weight': item.details?.weight || 'N/A',
      'Imported At': format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Details');

    const fileName = `import_job_${selectedJob.id.substring(0, 8)}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success('Job details exported successfully');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'completed': 'default',
      'in_progress': 'secondary',
      'cancelled': 'destructive',
      'failed': 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Import Job History</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadJobs}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {loading && jobs.length === 0 ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Card>
      ) : jobs.length === 0 ? (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">No import jobs found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <h4 className="font-medium capitalize">{job.type.replace('_', ' ')}</h4>
                    {getStatusBadge(job.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Started</p>
                      <p className="font-medium">{format(new Date(job.created_at), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                    {job.completed_at && (
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-medium">{format(new Date(job.completed_at), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Total Items</p>
                      <p className="font-medium">{job.total_items}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Success / Errors</p>
                      <p className="font-medium">
                        <span className="text-green-600">{job.success_count}</span>
                        {' / '}
                        <span className="text-red-600">{job.error_count}</span>
                      </p>
                    </div>
                  </div>

                  {job.result_summary && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <span>Searched: {job.result_summary.total_searched}</span>
                      {' • '}
                      <span>Matched: {job.result_summary.total_matched}</span>
                      {' • '}
                      <span>Skipped: {job.result_summary.skipped_from_history || 0}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadJobDetails(job)}
                  className="ml-4"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Import Job Details</span>
              <Button
                variant="outline"
                size="sm"
                onClick={exportJobDetails}
                disabled={jobItems.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No items found</p>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU Code</TableHead>
                    <TableHead>Model Number</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Imported At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku_code}</TableCell>
                      <TableCell>{item.model_number || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.details?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{item.details?.price || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'imported' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
