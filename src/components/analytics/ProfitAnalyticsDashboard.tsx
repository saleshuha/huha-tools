import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";

interface ProfitAnalyticsDashboardProps {
  profitData: any[];
}

export function ProfitAnalyticsDashboard({ profitData }: ProfitAnalyticsDashboardProps) {
  if (!profitData || profitData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No profit data available. Please upload sales and cost data first.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary metrics
  const totalRevenue = profitData.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);
  const totalCost = profitData.reduce((sum, item) => sum + (item.costPrice || 0), 0);
  const totalProfit = profitData.reduce((sum, item) => sum + (item.finalProfit || 0), 0);
  const totalReturnLoss = profitData.reduce((sum, item) => sum + (item.returnLoss || 0), 0);
  const avgMargin = profitData.length > 0 ? profitData.reduce((sum, item) => sum + (item.profitMargin || 0), 0) / profitData.length : 0;

  // Prepare chart data
  const profitableItems = profitData.filter(item => (item.finalProfit || 0) > 0);
  const unprofitableItems = profitData.filter(item => (item.finalProfit || 0) <= 0);

  const profitDistribution = [
    { name: 'Profitable Items', value: profitableItems.length, color: '#22c55e' },
    { name: 'Unprofitable Items', value: unprofitableItems.length, color: '#ef4444' }
  ];

  // Top 10 most profitable items
  const topProfitableItems = [...profitData]
    .sort((a, b) => (b.finalProfit || 0) - (a.finalProfit || 0))
    .slice(0, 10)
    .map(item => ({
      name: item.itemName || item.sku || 'Unknown',
      profit: item.finalProfit || 0,
      margin: item.profitMargin || 0
    }));

  // Monthly trend (mock data - would need actual dates)
  const monthlyTrend = [
    { month: 'Jan', revenue: totalRevenue * 0.8, profit: totalProfit * 0.7 },
    { month: 'Feb', revenue: totalRevenue * 0.9, profit: totalProfit * 0.85 },
    { month: 'Mar', revenue: totalRevenue * 1.1, profit: totalProfit * 1.2 },
    { month: 'Apr', revenue: totalRevenue, profit: totalProfit },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {profitData.length} items sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {avgMargin.toFixed(1)}% average margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Losses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalReturnLoss.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalReturnLoss / totalRevenue) * 100).toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitable Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitableItems.length}</div>
            <p className="text-xs text-muted-foreground">
              {((profitableItems.length / profitData.length) * 100).toFixed(1)}% of total items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profit Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={profitDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {profitDistribution.map((entry, index) => (
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
            <CardTitle>Revenue vs Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Profitable Items */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Most Profitable Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProfitableItems} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Bar dataKey="profit" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}