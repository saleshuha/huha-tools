import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Database,
  FileText,
  BarChart3,
  Trash2,
  Download
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NoonSalesUpload } from "@/components/noon/NoonSalesUpload";

interface Store {
  id: string;
  name: string;
  location?: string;
}

interface UploadHistory {
  id: string;
  store_name: string;
  report_month: string;
  upload_date: string;
  record_count: number;
}

export default function NoonSalesData() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  useEffect(() => {
    loadStores();
    loadUploadHistory();
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

  const loadUploadHistory = async () => {
    try {
      setLoading(true);
      
      // Get actual counts per group using a direct aggregation query
      console.log('Querying with country_code:', selectedCountry);
      const { data: countData, error: countError } = await supabase
        .from('noon_sales_data')
        .select('store_id, report_month, upload_date')
        .eq('country_code', selectedCountry)
        .range(0, 9999); // Use range instead of limit to ensure we get all records

      if (countError) throw countError;
      
      console.log('Total records fetched for counting:', countData?.length);

      // Count records per group
      const counts = new Map<string, number>();
      const uploads = new Map<string, any>();
      
      countData?.forEach(record => {
        const key = `${record.store_id}-${record.report_month}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!uploads.has(key)) {
          uploads.set(key, record);
        }
      });
      
      console.log('Grouped counts:', Array.from(counts.entries()));
      
      // Get store names for the uploads
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .in('id', Array.from(uploads.values()).map(u => u.store_id));

      if (storeError) throw storeError;
      
      const storeNames = new Map(storeData?.map(s => [s.id, s.name]) || []);
      
      // Create upload history entries
      const history = Array.from(uploads.entries()).map(([key, record]) => ({
        id: crypto.randomUUID(),
        store_name: storeNames.get(record.store_id) || 'Unknown Store',
        report_month: record.report_month,
        upload_date: record.upload_date,
        record_count: counts.get(key) || 0
      }));
      
      console.log('Final upload history:', history);
      setUploadHistory(history);
    } catch (error) {
      console.error('Error loading upload history:', error);
      toast({
        title: "Error loading history",
        description: "Failed to load upload history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataUploaded = () => {
    toast({
      title: "Data uploaded successfully",
      description: "Sales data has been processed and saved"
    });
    loadUploadHistory();
  };

  const deleteUpload = async (reportMonth: string, storeName: string) => {
    if (!confirm(`Are you sure you want to delete all data for ${storeName} - ${reportMonth}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('noon_sales_data')
        .delete()
        .eq('report_month', reportMonth)
        .eq('country_code', selectedCountry);

      if (error) throw error;

      toast({
        title: "Data deleted",
        description: "Upload data has been deleted successfully"
      });

      loadUploadHistory();
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast({
        title: "Error",
        description: "Failed to delete upload data",
        variant: "destructive"
      });
    }
  };

  const exportData = async (reportMonth: string) => {
    try {
      const { data, error } = await supabase
        .from('noon_sales_data')
        .select('*')
        .eq('report_month', reportMonth)
        .eq('country_code', selectedCountry);

      if (error) throw error;

      // Convert to CSV
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `noon-sales-data-${reportMonth}.csv`;
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

  const getTotalRecords = () => {
    return uploadHistory.reduce((sum, upload) => sum + upload.record_count, 0);
  };

  const getUniqueMonths = () => {
    return new Set(uploadHistory.map(upload => upload.report_month)).size;
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
                <Upload className="h-8 w-8 text-primary" />
                Noon Sales Data Upload
              </h1>
              <p className="text-slate-600 mt-1">
                Upload and manage sales data by date/month for {selectedCountry}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalRecords().toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Sales data records
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Uploads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uploadHistory.length}</div>
              <p className="text-xs text-muted-foreground">
                Upload sessions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Months</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueMonths()}</div>
              <p className="text-xs text-muted-foreground">
                Report periods
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle>Upload Sales Data</CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No stores available</h3>
                <p className="text-slate-600 mb-4">
                  You need to create a Noon store before uploading sales data
                </p>
                <Button asChild>
                  <Link to="/noon-stores">
                    Create Store
                  </Link>
                </Button>
              </div>
            ) : (
              <NoonSalesUpload
                onDataUploaded={handleDataUploaded}
              />
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
            ) : uploadHistory.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No uploads found</h3>
                <p className="text-slate-600">
                  Upload your first sales data file to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Report Month</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadHistory.map((upload, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{upload.store_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {upload.report_month}
                          </Badge>
                        </TableCell>
                        <TableCell>{upload.record_count.toLocaleString()}</TableCell>
                        <TableCell>{formatDate(upload.upload_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportData(upload.report_month)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteUpload(upload.report_month, upload.store_name)}
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