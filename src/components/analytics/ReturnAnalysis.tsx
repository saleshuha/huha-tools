import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingDown, Package, DollarSign } from "lucide-react";

interface ReturnAnalysisProps {
  returnsData: any[];
  salesData: any[];
}

export function ReturnAnalysis({ returnsData, salesData }: ReturnAnalysisProps) {
  if (!returnsData || returnsData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Return Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No return data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate return metrics
  const totalReturns = returnsData.length;
  const totalReturnValue = returnsData.reduce((sum, ret) => sum + (ret.refundedAmount || 0), 0);
  const totalReturnCharges = returnsData.reduce((sum, ret) => sum + (ret.totalDeduction || 0), 0);
  const totalSales = salesData?.length || 0;
  const returnRate = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;

  // Group returns by item
  const returnsByItem = returnsData.reduce((acc, ret) => {
    const key = ret.sku || ret.asin || ret.itemName || 'Unknown';
    if (!acc[key]) {
      acc[key] = {
        itemName: ret.itemName || key,
        sku: ret.sku,
        asin: ret.asin,
        count: 0,
        totalRefunded: 0,
        totalCharges: 0,
        avgRefund: 0
      };
    }
    acc[key].count++;
    acc[key].totalRefunded += ret.refundedAmount || 0;
    acc[key].totalCharges += ret.totalDeduction || 0;
    acc[key].avgRefund = acc[key].totalRefunded / acc[key].count;
    return acc;
  }, {});

  const topReturnedItems = Object.values(returnsByItem)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  // Return reasons analysis (mock data - would need actual reasons)
  const returnReasons = [
    { name: 'Defective Product', value: Math.floor(totalReturns * 0.3), color: '#ef4444' },
    { name: 'Wrong Item', value: Math.floor(totalReturns * 0.25), color: '#f97316' },
    { name: 'Not as Described', value: Math.floor(totalReturns * 0.2), color: '#eab308' },
    { name: 'Damaged in Transit', value: Math.floor(totalReturns * 0.15), color: '#3b82f6' },
    { name: 'Customer Changed Mind', value: Math.floor(totalReturns * 0.1), color: '#8b5cf6' }
  ];

  // Monthly return trend (mock data)
  const monthlyReturnTrend = [
    { month: 'Jan', returns: Math.floor(totalReturns * 0.2), charges: totalReturnCharges * 0.2 },
    { month: 'Feb', returns: Math.floor(totalReturns * 0.25), charges: totalReturnCharges * 0.25 },
    { month: 'Mar', returns: Math.floor(totalReturns * 0.3), charges: totalReturnCharges * 0.3 },
    { month: 'Apr', returns: Math.floor(totalReturns * 0.25), charges: totalReturnCharges * 0.25 }
  ];

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReturns}</div>
            <p className="text-xs text-muted-foreground">
              {returnRate.toFixed(1)}% return rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalReturnValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total refunded to customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Charges</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalReturnCharges)}</div>
            <p className="text-xs text-muted-foreground">
              Total deductions and fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Return Value</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalReturns > 0 ? totalReturnValue / totalReturns : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per return average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Return Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={returnReasons}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {returnReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Return Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyReturnTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="returns" fill="#ef4444" name="Return Count" />
                <Bar dataKey="charges" fill="#dc2626" name="Return Charges ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Returned Items */}
      <Card>
        <CardHeader>
          <CardTitle>Most Returned Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU/ASIN</TableHead>
                  <TableHead className="text-right">Return Count</TableHead>
                  <TableHead className="text-right">Total Refunded</TableHead>
                  <TableHead className="text-right">Total Charges</TableHead>
                  <TableHead className="text-right">Avg Refund</TableHead>
                  <TableHead className="text-right">Net Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topReturnedItems.map((item: any, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-48">
                      <div className="truncate" title={item.itemName}>
                        {item.itemName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                        {item.asin && <div className="text-xs text-muted-foreground">ASIN: {item.asin}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{item.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.totalRefunded)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.totalCharges)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.avgRefund)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">
                        {formatCurrency(item.totalRefunded + item.totalCharges)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Returns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead className="text-right">Refunded Amount</TableHead>
                  <TableHead className="text-right">Commission Refund</TableHead>
                  <TableHead className="text-right">Shipping Charges</TableHead>
                  <TableHead className="text-right">Total Deduction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnsData.slice(0, 10).map((ret, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {ret.itemName || ret.sku || ret.asin || 'Unknown Item'}
                    </TableCell>
                    <TableCell>
                      {ret.returnDate ? new Date(ret.returnDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ret.refundedAmount || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ret.commissionRefund || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ret.shippingCharges || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">
                        {formatCurrency(ret.totalDeduction || 0)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}