import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Download, Search, Package, RotateCcw, Settings, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSKUManager } from '@/hooks/useSKUManager';
import { useImportJobs } from '@/hooks/useImportJobs';
import { usePOOrders } from '@/hooks/usePOOrders';
import { supabase } from '@/integrations/supabase/client';

export function SunskySKUImporter() {
  const { profile } = useUserProfile();
  const { createImportJob, createItemNosJob, createPoSearchJob, jobs, fetchJobs, isLoading: jobsLoading } = useImportJobs();
  const { sunskySKUs, fetchSKUs, isLoading: skusLoading, refreshSKUs } = useSKUManager();

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(false);

  // Import selected SKUs using background job
  const importSelectedSKUs = async () => {
    if (selectedProducts.size === 0) {
      toast.error("No Products Selected - Please select products to import");
      return;
    }

    try {
      const productList = Array.from(selectedProducts);
      
      // Create background job for importing selected SKUs
      await createItemNosJob(productList);
      
      // Clear selections since job is now running in background
      setSelectedProducts(new Set());
      
      toast.success(`Background import job created for ${productList.length} products. Check the Import Jobs tab for progress.`);
      
    } catch (error) {
      console.error('Error starting import job:', error);
      toast.error("Failed to start import job");
    }
  };

  // Search PO model numbers using background job
  const handleSearchPOModelNumbers = async () => {
    if (!hasCredentials) {
      toast.error("API Credentials Required - Please configure your Sunsky API credentials first");
      return;
    }

    try {
      // Create background job for PO search
      await createPoSearchJob();
      
      toast.success("Background PO search job created. Check the Import Jobs tab for progress.");
      
    } catch (error) {
      console.error('Error starting PO search job:', error);
      toast.error("Failed to start PO search job");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sunsky SKU Importer</h1>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search & Import</TabsTrigger>
          <TabsTrigger value="jobs">Import Jobs ({jobs?.filter(j => j.status === 'processing').length || 0})</TabsTrigger>
          <TabsTrigger value="imported">Imported SKUs ({sunskySKUs?.length || 0})</TabsTrigger> 
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Background Import</CardTitle>
              <CardDescription>
                All import operations now run in the background. You can navigate away and jobs will continue processing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={importSelectedSKUs}
                  disabled={selectedProducts.size === 0 || jobsLoading || !hasCredentials}
                  className="flex items-center gap-2"
                >
                  {jobsLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Starting Job...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Import Selected ({selectedProducts.size})
                    </>
                  )}
                </Button>

                <Button
                  disabled={!hasCredentials || jobsLoading}
                  onClick={handleSearchPOModelNumbers}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {jobsLoading ? 'Starting Job...' : 'Search PO Model Numbers'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Jobs</CardTitle>
              <CardDescription>
                Background import jobs that continue running even if you navigate away
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!jobs || jobs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No import jobs found</p>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{job.type.replace('_', ' ')}</span>
                          <Badge variant={
                            job.status === 'completed' ? 'default' : 
                            job.status === 'failed' ? 'destructive' : 
                            job.status === 'processing' ? 'secondary' : 'outline'
                          }>
                            {job.status === 'processing' && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
                            {job.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {job.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                            {job.status === 'queued' && <Clock className="h-3 w-3 mr-1" />}
                            {job.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {job.processed_items}/{job.total_items} items
                        </div>
                      </div>
                      
                      {job.total_items && job.total_items > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(job.processed_items / job.total_items) * 100}%` }}
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>✓ {job.success_count} success</span>
                        <span>✗ {job.error_count} errors</span>
                        <span>Created: {new Date(job.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imported" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imported SKUs</CardTitle>
              <CardDescription>SKUs imported from Sunsky</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                {skusLoading ? 'Loading SKUs...' : `${sunskySKUs?.length || 0} SKUs imported`}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Configure your Sunsky API credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                {hasCredentials ? 'API credentials configured' : 'Please configure API credentials'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}