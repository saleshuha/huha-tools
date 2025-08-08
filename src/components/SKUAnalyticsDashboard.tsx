import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Database, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProcessingAnalytics {
  totalRowsProcessed: number;
  uniqueSkusFound: number;
  duplicatesFiltered: number;
  savedToDatabase: number;
  errors: number;
}

interface SKUAnalyticsDashboardProps {
  analytics: ProcessingAnalytics;
  onReset: () => void;
}

export function SKUAnalyticsDashboard({ analytics, onReset }: SKUAnalyticsDashboardProps) {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const [databaseCount, setDatabaseCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDatabaseCount = async () => {
    if (!profile?.country) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sunsky_skus')
        .select('id', { count: 'exact', head: true })
        .eq('country', profile.country);
        
      if (error) {
        console.error('Error fetching SKU count:', error);
        toast({
          title: "Database Query Error",
          description: "Failed to fetch current SKU count from database",
          variant: "destructive"
        });
        return;
      }
      
      setDatabaseCount(data?.length || 0);
      console.log(`Current database count for ${profile.country}: ${data?.length || 0}`);
    } catch (error) {
      console.error('Error fetching database count:', error);
      toast({
        title: "Database Connection Error",
        description: "Failed to connect to database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseCount();
  }, [profile?.country, analytics.savedToDatabase]);

  const hasProcessedData = analytics.totalRowsProcessed > 0;
  const hasDiscrepancy = analytics.savedToDatabase !== analytics.uniqueSkusFound && analytics.uniqueSkusFound > 0;
  const effectiveSuccessRate = analytics.totalRowsProcessed > 0 
    ? ((analytics.savedToDatabase / analytics.totalRowsProcessed) * 100).toFixed(1)
    : '0';

  if (!hasProcessedData) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Processing Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDatabaseCount}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-2"
            >
              Reset Stats
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.totalRowsProcessed.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Rows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.uniqueSkusFound.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Unique SKUs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{analytics.duplicatesFiltered.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Duplicates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{analytics.savedToDatabase.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Saved to DB</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{analytics.errors}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
        </div>
        
        {/* Success Rate */}
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Processing Success Rate:</span>
            <span className={`text-lg font-bold ${parseFloat(effectiveSuccessRate) > 95 ? 'text-green-600' : parseFloat(effectiveSuccessRate) > 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {effectiveSuccessRate}%
            </span>
          </div>
        </div>
        
        {/* Database Verification */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Database Status ({profile?.country || 'Unknown'}):</span>
            </div>
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </div>
          
          <div className="text-lg font-bold mb-2">
            {databaseCount.toLocaleString()} SKUs in database
          </div>
          
          {/* Discrepancy Detection */}
          {hasDiscrepancy && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-medium">⚠️ CRITICAL: Database Save Issue Detected</div>
                <div className="mb-2">Found {analytics.uniqueSkusFound.toLocaleString()} unique SKUs but only saved {analytics.savedToDatabase.toLocaleString()}</div>
                <div className="space-y-1">
                  <div>🔍 <strong>Root Cause:</strong> Duplicate constraint violations preventing saves</div>
                  <div>🔧 <strong>Solutions:</strong></div>
                  <div className="ml-4 space-y-1">
                    <div>• Wait for existing SKU detection to complete before processing</div>
                    <div>• Click "Refresh" to reload duplicate detection database</div>
                    <div>• Check error log below for specific constraint violations</div>
                    <div>• Consider processing smaller batches to reduce conflicts</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!hasDiscrepancy && analytics.savedToDatabase > 0 && (
            <div className="flex items-center gap-2 text-green-600 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              ✅ All unique SKUs successfully saved to database
            </div>
          )}
          
          {analytics.uniqueSkusFound > 0 && analytics.savedToDatabase === 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-medium">⚠️ No SKUs Saved Despite Finding Unique Ones</div>
                <div>This indicates all "unique" SKUs are actually duplicates in the database</div>
                <div className="mt-1">
                  <strong>Action needed:</strong> Refresh duplicate detection or check if SKUs were previously uploaded
                </div>
              </div>
            </div>
          )}
          
          {/* Processing Summary */}
          <div className="mt-3 text-xs text-muted-foreground">
            <div>• Duplicate Rate: {analytics.totalRowsProcessed > 0 ? ((analytics.duplicatesFiltered / analytics.totalRowsProcessed) * 100).toFixed(1) : 0}%</div>
            <div>• Error Rate: {analytics.totalRowsProcessed > 0 ? ((analytics.errors / (analytics.totalRowsProcessed / 1000)) * 100).toFixed(1) : 0}%</div>
            {analytics.totalRowsProcessed >= 720000 && (
              <div className="text-green-600 font-medium">✅ Large dataset processing completed (720K+ rows)</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}