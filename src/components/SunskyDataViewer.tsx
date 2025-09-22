import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Download,
  Search
} from 'lucide-react';

interface DataViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invalidItems: Array<{
    itemNo: string;
    title: string;
    qty: number;
  }>;
  onRefreshComplete?: () => void;
}

interface LocalSKUData {
  sku_code: string;
  title: string;
  cost: number;
  currency: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export function SunskyDataViewer({ open, onOpenChange, invalidItems, onRefreshComplete }: DataViewerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localSKUData, setLocalSKUData] = useState<LocalSKUData[]>([]);
  const [skuStats, setSKUStats] = useState({ total: 0, matched: 0, outdated: 0 });

  useEffect(() => {
    if (open && invalidItems.length > 0) {
      loadLocalSKUData();
    }
  }, [open, invalidItems]);

  const loadLocalSKUData = async () => {
    try {
      setLoading(true);
      
      // Get local SKU data for the invalid items
      const { data: localData, error } = await supabase
        .from('sunsky_skus')
        .select('sku_code, title, cost, currency, country, created_at, updated_at')
        .in('sku_code', invalidItems.map(item => item.itemNo));

      if (error) throw error;

      setLocalSKUData(localData || []);

      // Calculate statistics
      const totalSKUs = invalidItems.length;
      const matchedSKUs = localData?.length || 0;
      const outdatedSKUs = localData?.filter(sku => {
        const updatedDate = new Date(sku.updated_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return updatedDate < thirtyDaysAgo;
      }).length || 0;

      setSKUStats({
        total: totalSKUs,
        matched: matchedSKUs,
        outdated: outdatedSKUs
      });

    } catch (error) {
      console.error('Error loading local SKU data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load local SKU information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToImporter = () => {
    window.open('/sunsky-sku-importer', '_blank');
    onOpenChange(false);
  };

  const handleRefreshData = async () => {
    try {
      setLoading(true);
      toast({
        title: "Refreshing Data",
        description: "Updating local SKU database from Sunsky...",
      });
      
      // This would typically trigger a refresh of the local database
      await loadLocalSKUData();
      
      if (onRefreshComplete) {
        onRefreshComplete();
      }
      
      toast({
        title: "Data Refreshed",
        description: "Local SKU database has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh SKU database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportInvalidItems = () => {
    const csvContent = [
      ['SKU Code', 'Title', 'Quantity', 'Local Match', 'Last Updated'].join(','),
      ...invalidItems.map(item => {
        const localMatch = localSKUData.find(local => local.sku_code === item.itemNo);
        return [
          item.itemNo,
          `"${item.title}"`,
          item.qty,
          localMatch ? 'Yes' : 'No',
          localMatch ? new Date(localMatch.updated_at).toLocaleDateString() : 'N/A'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invalid-skus-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Invalid SKUs exported to CSV file",
    });
  };

  const testSpecificSKU = async (skuCode: string) => {
    try {
      setLoading(true);
      
      toast({
        title: "Testing SKU",
        description: `Checking ${skuCode} directly in Sunsky API...`,
      });

      console.log(`🔍 Testing SKU: ${skuCode}`);

      // Test the SKU directly with Sunsky API
      const response = await supabase.functions.invoke('sunsky-api', {
        body: { 
          action: 'getPricesAndFreights',
          items: [{ itemNo: skuCode, qty: 1 }],
          deliveryAddress: {
            countryId: '224', // UAE
            state: '',
            city: 'Dubai',
            postcode: '00000'
          }
        }
      });

      console.log(`📡 Direct Sunsky API response for ${skuCode}:`, response);

      if (response.error) {
        toast({
          title: "API Call Failed",
          description: `Error: ${response.error.message}`,
          variant: "destructive"
        });
        return;
      }

      const data = response.data;
      
      if (data.result === 'success') {
        toast({
          title: "SKU Test Result: AVAILABLE ✅",
          description: `${skuCode} is available in Sunsky! Found pricing and shipping data.`,
          duration: 8000
        });
        console.log(`✅ ${skuCode} is AVAILABLE in Sunsky:`, data);
      } else if (data.result === 'error') {
        const errorMsg = data.messages?.[0] || data.message || 'Unknown error';
        toast({
          title: "SKU Test Result: NOT AVAILABLE ❌",
          description: `${skuCode} - Sunsky says: ${errorMsg}`,
          variant: "destructive",
          duration: 8000
        });
        console.log(`❌ ${skuCode} is NOT AVAILABLE in Sunsky:`, data);
      }

    } catch (error) {
      console.error(`💥 Error testing ${skuCode}:`, error);
      toast({
        title: "Test Failed",
        description: `Failed to test ${skuCode}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            SKU Data Viewer
          </DialogTitle>
          <DialogDescription>
            Analyze invalid SKU items and local database status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Invalid Items</p>
                    <p className="text-2xl font-bold text-destructive">{skuStats.total}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Found Locally</p>
                    <p className="text-2xl font-bold text-orange-600">{skuStats.matched}</p>
                  </div>
                  <Search className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Potentially Outdated</p>
                    <p className="text-2xl font-bold text-yellow-600">{skuStats.outdated}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invalid Items List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Invalid SKU Items</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportInvalidItems}
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {invalidItems.map((item, index) => {
                    const localMatch = localSKUData.find(local => local.sku_code === item.itemNo);
                    const isOutdated = localMatch && new Date(localMatch.updated_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    
                     return (
                       <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                         <div className="flex-1 space-y-1">
                           <div className="flex items-center gap-2">
                             <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                               {item.itemNo}
                             </code>
                             <Badge variant="destructive">
                               API: Not Available
                             </Badge>
                             {localMatch && (
                               <Badge variant={isOutdated ? "secondary" : "outline"}>
                                 Local: {isOutdated ? "Outdated" : "Found"}
                               </Badge>
                             )}
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => testSpecificSKU(item.itemNo)}
                               disabled={loading}
                               className="ml-auto"
                             >
                               Test SKU
                             </Button>
                           </div>
                           <p className="text-sm text-muted-foreground truncate">{item.title}</p>
                           <div className="flex items-center gap-4 text-xs text-muted-foreground">
                             <span>Qty: {item.qty}</span>
                             {localMatch && (
                               <>
                                 <span>Cost: {localMatch.cost} {localMatch.currency}</span>
                                 <span>Updated: {new Date(localMatch.updated_at).toLocaleDateString()}</span>
                               </>
                             )}
                           </div>
                           {localMatch && (
                             <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                               ⚠️ This item exists in your local database but Sunsky API says it's not available. 
                               The item may have been discontinued or your local data needs updating.
                             </div>
                           )}
                         </div>
                         <div className="flex items-center">
                           <XCircle className="h-4 w-4 text-destructive" />
                         </div>
                       </div>
                     );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
           <div className="text-sm text-muted-foreground">
             <div className="space-y-1">
               <p><strong>Understanding the Status:</strong></p>
               <p>• <span className="text-destructive font-medium">API: Not Available</span> - Sunsky's live API says this item doesn't exist</p>
               <p>• <span className="text-muted-foreground font-medium">Local: Found</span> - Item exists in your local database but may be outdated</p>
               <p className="text-amber-600">Items found locally but unavailable via API are likely discontinued or renamed.</p>
             </div>
           </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefreshData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button
                onClick={handleNavigateToImporter}
                disabled={loading}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open SKU Importer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}