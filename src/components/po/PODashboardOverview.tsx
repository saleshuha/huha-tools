import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Truck,
  AlertCircle,
  DollarSign,
  FileText,
  Building2,
  ArrowRight
} from "lucide-react";
import { usePODashboard, type PODashboardSummary } from "@/hooks/usePODashboard";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface PODashboardOverviewProps {
  onViewDetails: (type: 'pending' | 'ordered' | 'shipped' | 'all') => void;
}

export const PODashboardOverview = ({ onViewDetails }: PODashboardOverviewProps) => {
  const { summary, isLoading, fetchDashboardSummary } = usePODashboard();

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'ordered': return 'bg-blue-500';
      case 'shipped': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_active_orders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {summary.unique_po_numbers} unique PO numbers
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_active_quantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Items in pipeline</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.total_active_value.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Active orders value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Processing</span>
                  <span>{Math.round((summary.pending_orders / (summary.total_active_orders || 1)) * 100)}%</span>
                </div>
                <Progress 
                  value={(summary.pending_orders / (summary.total_active_orders || 1)) * 100} 
                  className="h-1" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails('pending')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.pending_orders}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails('ordered')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.ordered_orders}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">With supplier</p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails('shipped')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.shipped_orders}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">In transit</p>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Top Suppliers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.recent_uploads.length > 0 ? (
                summary.recent_uploads.map((upload, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{upload.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {upload.order_count} orders • {formatDistanceToNow(new Date(upload.upload_date))} ago
                      </p>
                    </div>
                    <Badge variant="outline">{upload.order_count}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent uploads</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.top_suppliers.length > 0 ? (
                summary.top_suppliers.map((supplier, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">PO #{supplier.po_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {supplier.order_count} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">${supplier.total_value.toFixed(0)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No supplier data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};