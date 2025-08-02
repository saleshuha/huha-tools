import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { supabase } from "@/integrations/supabase/client";
import { 
  Receipt, 
  ArrowLeft, 
  FileText,
  Database,
  BarChart3,
  Trash2,
  Download,
  Upload,
  Store
} from "lucide-react";
import { Link } from "react-router-dom";
import { NoonFeesUpload } from "@/components/noon/NoonFeesUpload";
import { NoonOrderFeesData } from "@/types/noon-fees";

interface Store {
  id: string;
  name: string;
  location?: string;
}

interface FeesSummary {
  store_id: string;
  store_name: string;
  report_month: string;
  upload_date: string;
  record_count: number;
}

export default function NoonFeesReports() {
  const [stores, setStores] = useState<Store[]>([]);
  const [feesSummary, setFeesSummary] = useState<FeesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  useEffect(() => {
    loadStores();
    loadFeesSummary();
  }, [selectedCountry]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, location')
        .eq('platform', 'noon')
        .eq('country', selectedCountry)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast({
        title: "Error loading stores",
        description: "Failed to load stores from database",
        variant: "destructive"
      });
    }
  };

  const loadFeesSummary = useCallback(async () => {
    try {
      setLoading(true);
      
      // Step 1: Get exact total count
      const { count: totalCount, error: countError } = await supabase
        .from('noon_order_fees')
        .select('*', { count: 'exact', head: true })
        .eq('country_code', selectedCountry);

      if (countError) throw countError;
      
      console.log('Total fees records in database:', totalCount);
      setTotalRecords(totalCount || 0);

      if (!totalCount || totalCount === 0) {
        setFeesSummary([]);
        setTotalRecords(0);
        return;
      }

      // Step 2: Fetch ALL records in batches to avoid limits
      const batchSize = 1000;
      const allRecords: Array<{ store_id: string; report_month: string; upload_date: string }> = [];
      
      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const { data: batchRecords, error: batchError } = await supabase
          .from('noon_order_fees')
          .select('store_id, report_month, upload_date')
          .eq('country_code', selectedCountry)
          .range(offset, offset + batchSize - 1);

        if (batchError) throw batchError;
        
        if (batchRecords && batchRecords.length > 0) {
          allRecords.push(...batchRecords);
        }
        
        // Break if we got fewer records than expected (reached end)
        if (!batchRecords || batchRecords.length < batchSize) {
          break;
        }
      }

      console.log('Total fees records fetched:', allRecords.length, 'of', totalCount);

      if (allRecords.length === 0) {
        setFeesSummary([]);
        return;
      }

      // Step 3: Get store names
      const uniqueStoreIds = [...new Set(allRecords.map(r => r.store_id))];
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name')
        .in('id', uniqueStoreIds);

      const storeMap = new Map(stores?.map(s => [s.id, s.name]) || []);

      // Step 4: Group and aggregate
      const groupedSummary = new Map<string, FeesSummary>();
      
      allRecords.forEach(record => {
        const key = `${record.store_id}-${record.report_month}`;
        
        if (!groupedSummary.has(key)) {
          groupedSummary.set(key, {
            store_id: record.store_id,
            store_name: storeMap.get(record.store_id) || 'Unknown Store',
            report_month: record.report_month,
            upload_date: record.upload_date,
            record_count: 1
          });
        } else {
          const existing = groupedSummary.get(key)!;
          existing.record_count += 1;
          // Keep the latest upload date
          if (new Date(record.upload_date) > new Date(existing.upload_date)) {
            existing.upload_date = record.upload_date;
          }
        }
      });

      const summary = Array.from(groupedSummary.values()).sort((a, b) => 
        new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
      );

      console.log('Summary groups created:', summary.length);
      console.log('Total records represented:', allRecords.length);
      
      setFeesSummary(summary);
      
    } catch (error) {
      console.error('Error loading fees summary:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load fees summary",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, toast]);

  const handleDataUploaded = (data: NoonOrderFeesData[]) => {
    toast({
      title: "Fees data uploaded successfully",
      description: `${data.length} fee records processed and saved`
    });
    loadFeesSummary();
  };

  const deleteUpload = async (reportMonth: string, storeName: string) => {
    if (!confirm(`Are you sure you want to delete all fees data for ${storeName} - ${reportMonth}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('noon_order_fees')
        .delete()
        .eq('report_month', reportMonth)
        .eq('country_code', selectedCountry);

      if (error) throw error;

      toast({
        title: "Data deleted",
        description: "Fees data has been deleted successfully"
      });

      loadFeesSummary();
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast({
        title: "Error",
        description: "Failed to delete fees data",
        variant: "destructive"
      });
    }
  };

  const exportData = async (reportMonth: string) => {
    try {
      const { data, error } = await supabase
        .from('noon_order_fees')
        .select('*')
        .eq('report_month', reportMonth)
        .eq('country_code', selectedCountry);

      if (error) throw error;

      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `noon-fees-data-${reportMonth}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUniqueMonths = () => {
    return new Set(feesSummary.map(summary => summary.report_month)).size;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/noon-dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Receipt className="h-8 w-8 text-primary" />
                Noon Fees Reports - {selectedCountry}
              </h1>
              <p className="text-slate-600 mt-1">
                Upload and manage consolidated item level fees reports for {selectedCountry}
              </p>
            </div>
          </div>
          <CountrySwitcher />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fee Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Fee transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upload Sessions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{feesSummary.length}</div>
              <p className="text-xs text-muted-foreground">
                Data uploads
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Report Periods</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueMonths()}</div>
              <p className="text-xs text-muted-foreground">
                Unique months
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
              <p className="text-xs text-muted-foreground">
                Available stores
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Fees Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No stores available</h3>
                <p className="text-slate-600 mb-4">
                  You need to create a Noon store before uploading fees reports
                </p>
                <Button asChild>
                  <Link to="/noon-stores">
                    Create Store
                  </Link>
                </Button>
              </div>
            ) : (
              <NoonFeesUpload onDataUploaded={handleDataUploaded} />
            )}
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading upload history...</div>
            ) : feesSummary.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No fees reports found</h3>
                <p className="text-slate-600">
                  Upload your first consolidated item level fees report to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Report Month</TableHead>
                      <TableHead>Fee Records</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feesSummary.map((summary, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{summary.store_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.report_month}
                          </Badge>
                        </TableCell>
                        <TableCell>{summary.record_count.toLocaleString()}</TableCell>
                        <TableCell>{formatDate(summary.upload_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportData(summary.report_month)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteUpload(summary.report_month, summary.store_name)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}