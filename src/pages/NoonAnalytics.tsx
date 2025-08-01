import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useCountry } from "@/contexts/CountryContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    sku: string;
    orders: number;
    revenue: number;
  }>;
}

export default function NoonAnalytics() {
  const { selectedCountry } = useCountry();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topSellingProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedCountry]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get analytics data from noon_order_fees table
      const { data: feesData } = await supabase
        .from('noon_order_fees')
        .select('*')
        .eq('country_code', selectedCountry);

      if (feesData && feesData.length > 0) {
        const totalRevenue = feesData.reduce((sum, item) => sum + (item.total_payment || 0), 0);
        const totalOrders = feesData.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Group by SKU for top selling products
        const skuGroups = feesData.reduce((acc, item) => {
          if (!acc[item.sku]) {
            acc[item.sku] = { orders: 0, revenue: 0 };
          }
          acc[item.sku].orders += 1;
          acc[item.sku].revenue += item.total_payment || 0;
          return acc;
        }, {} as Record<string, { orders: number; revenue: number }>);

        const topSellingProducts = Object.entries(skuGroups)
          .map(([sku, data]) => ({ sku, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        setAnalytics({
          totalRevenue,
          totalOrders,
          averageOrderValue,
          topSellingProducts
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCountry === 'UAE' ? 'AED' : 'SAR'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link to="/noon-dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Noon Analytics Dashboard</h1>
            <p className="text-slate-600">Comprehensive analytics for {selectedCountry}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {analytics.totalOrders} orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.totalOrders.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All time orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(analytics.averageOrderValue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per order average
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Selling Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Selling Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topSellingProducts.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topSellingProducts.map((product, index) => (
                      <div key={product.sku} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{product.sku}</p>
                            <p className="text-sm text-slate-600">{product.orders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                          <p className="text-sm text-slate-600">Total Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sales data available for analytics</p>
                    <Button asChild className="mt-4">
                      <Link to="/noon-sales-data">Upload Sales Data</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}