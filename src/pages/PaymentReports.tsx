import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  ArrowLeft, 
  Database,
  FileText,
  DollarSign,
  Calendar,
  Trash2,
  Download
} from "lucide-react";
import { Link } from "react-router-dom";
import { PaymentReportsUpload } from "@/components/noon/PaymentReportsUpload";

interface Store {
  id: string;
  name: string;
  location?: string;
}

interface PaymentReportHistory {
  id: string;
  store_name: string;
  report_month: string;
  upload_date: string;
  record_count: number;
  total_amount: number;
  file_name: string;
}

export default function PaymentReports() {
  const [stores, setStores] = useState<Store[]>([]);
  const [reportHistory, setReportHistory] = useState<PaymentReportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  useEffect(() => {
    loadStores();
    loadReportHistory();
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

  const loadReportHistory = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('payment_reports')
        .select(`
          id,
          store_id,
          report_month,
          upload_date,
          file_name,
          gross_amount,
          net_amount,
          stores(name)
        `)
        .eq('country_code', selectedCountry)
        .order('upload_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by report month and store to get summaries
      const groupedData = new Map<string, PaymentReportHistory>();
      
      data?.forEach(record => {
        const key = `${record.store_id}-${record.report_month}`;
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            id: record.id,
            store_name: (record.stores as any)?.name || 'Unknown Store',
            report_month: record.report_month,
            upload_date: record.upload_date,
            record_count: 1,
            total_amount: record.net_amount || 0,
            file_name: record.file_name || ''
          });
        } else {
          const existing = groupedData.get(key)!;
          existing.record_count += 1;
          existing.total_amount += record.net_amount || 0;
        }
      });

      setReportHistory(Array.from(groupedData.values()));
    } catch (error) {
      console.error('Error loading report history:', error);
      toast({
        title: "Error loading history",
        description: "Failed to load report history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataUploaded = () => {
    toast({
      title: "Data uploaded successfully",
      description: "Payment reports have been processed and saved"
    });
    loadReportHistory();
  };

  const deleteReports = async (reportMonth: string, storeName: string) => {
    if (!confirm(`Are you sure you want to delete all payment reports for ${storeName} - ${reportMonth}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_reports')
        .delete()
        .eq('report_month', reportMonth)
        .eq('country_code', selectedCountry);

      if (error) throw error;

      toast({
        title: "Reports deleted",
        description: "Payment reports have been deleted successfully"
      });

      loadReportHistory();
    } catch (error) {
      console.error('Error deleting reports:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment reports",
        variant: "destructive"
      });
    }
  };

  const exportData = async (reportMonth: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_reports')
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
        a.download = `payment-reports-${reportMonth}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Failed to export payment reports",
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
    return reportHistory.reduce((sum, report) => sum + report.record_count, 0);
  };

  const getTotalAmount = () => {
    return reportHistory.reduce((sum, report) => sum + report.total_amount, 0);
  };

  const getUniqueMonths = () => {
    return new Set(reportHistory.map(report => report.report_month)).size;
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
                <DollarSign className="h-8 w-8 text-primary" />
                Payment Reports
              </h1>
              <p className="text-slate-600 mt-1">
                Upload and manage payment reports for {selectedCountry}
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
                Payment records
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AED {getTotalAmount().toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Net payments
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Report Uploads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportHistory.length}</div>
              <p className="text-xs text-muted-foreground">
                Upload sessions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Months</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueMonths()}</div>
              <p className="text-xs text-muted-foreground">
                Report periods
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Payment Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No stores available</h3>
                <p className="text-slate-600 mb-4">
                  You need to create a Noon store before uploading payment reports
                </p>
                <Button asChild>
                  <Link to="/noon-stores">
                    Create Store
                  </Link>
                </Button>
              </div>
            ) : (
              <PaymentReportsUpload
                onDataUploaded={handleDataUploaded}
              />
            )}
          </CardContent>
        </Card>

        {/* Report History */}
        <Card>
          <CardHeader>
            <CardTitle>Report History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading report history...</div>
            ) : reportHistory.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No reports found</h3>
                <p className="text-slate-600">
                  Upload your first payment report to get started
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
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportHistory.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{report.store_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.report_month}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.record_count.toLocaleString()}</TableCell>
                        <TableCell>AED {report.total_amount.toLocaleString()}</TableCell>
                        <TableCell>{formatDate(report.upload_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportData(report.report_month)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteReports(report.report_month, report.store_name)}
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