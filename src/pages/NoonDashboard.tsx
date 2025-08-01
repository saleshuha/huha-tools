import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Store, Upload, Receipt, DollarSign, CreditCard, BarChart3, ArrowRight, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useCountry } from "@/contexts/CountryContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
interface DashboardStats {
  stores: number;
  salesDataUploads: number;
  feesReports: number;
  skuCosts: number;
  paymentReports: number;
}
const modules = [{
  title: "Store Management",
  description: "Manage your Noon stores and configurations",
  icon: Store,
  href: "/noon-stores",
  color: "bg-blue-500",
  status: "active"
}, {
  title: "Sales Data Upload",
  description: "Upload and manage sales data by date/month",
  icon: Upload,
  href: "/noon-sales-data",
  color: "bg-green-500",
  status: "active"
}, {
  title: "Fees Reports",
  description: "Upload consolidated item level fees reports",
  icon: Receipt,
  href: "/noon-fees-reports",
  color: "bg-orange-500",
  status: "active"
}, {
  title: "SKU Cost Management",
  description: "Manage SKU costs for profit calculations",
  icon: DollarSign,
  href: "/noon-sku-costs",
  color: "bg-purple-500",
  status: "active"
}, {
  title: "Payment Reports",
  description: "Upload and track payment reports from Noon",
  icon: CreditCard,
  href: "/payment-reports",
  color: "bg-indigo-500",
  status: "active"
}, {
  title: "Analytics Dashboard",
  description: "Comprehensive analytics and reports",
  icon: BarChart3,
  href: "/noon-analytics",
  color: "bg-red-500",
  status: "active"
}];
export default function NoonDashboard() {
  const {
    selectedCountry
  } = useCountry();
  const [stats, setStats] = useState<DashboardStats>({
    stores: 0,
    salesDataUploads: 0,
    feesReports: 0,
    skuCosts: 0,
    paymentReports: 0
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadDashboardStats();
  }, [selectedCountry]);
  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Get stores count
      const {
        count: storesCount
      } = await supabase.from('stores').select('*', {
        count: 'exact',
        head: true
      }).eq('platform', 'noon').eq('country', selectedCountry);

      // Get sales data uploads count (unique months)
      const {
        data: salesData
      } = await supabase.from('noon_order_fees').select('report_month').eq('country_code', selectedCountry);
      const uniqueMonths = new Set(salesData?.map(item => item.report_month));

      // Get fees reports count
      const {
        count: feesCount
      } = await supabase.from('noon_order_fees').select('*', {
        count: 'exact',
        head: true
      }).eq('country_code', selectedCountry);

      // Get SKU costs count
      const {
        count: costsCount
      } = await supabase.from('sku_costs').select('*', {
        count: 'exact',
        head: true
      }).eq('country', selectedCountry);
      setStats({
        stores: storesCount || 0,
        salesDataUploads: uniqueMonths.size,
        feesReports: feesCount || 0,
        skuCosts: costsCount || 0,
        paymentReports: 0 // TODO: Implement when payment reports table is created
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'coming-soon':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'coming-soon':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Coming Soon</Badge>;
      default:
        return <Badge variant="outline">Inactive</Badge>;
    }
  };

  // Calculate completion percentage
  const totalModules = modules.filter(m => m.status === 'active').length;
  const completedModules = [stats.stores > 0, stats.salesDataUploads > 0, stats.feesReports > 0, stats.skuCosts > 0].filter(Boolean).length;
  const completionPercentage = completedModules / totalModules * 100;
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900">
            Noon Reports Dashboard
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Comprehensive management system for Noon marketplace data, analytics, and reporting
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <span>Country: {selectedCountry}</span>
          </div>
        </div>

        {/* Progress Overview */}
        

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => {
          const Icon = module.icon;
          return <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`${module.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(module.status)}
                      {getStatusBadge(module.status)}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between space-y-4">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {module.description}
                  </p>
                  
                  {module.status === 'active' ? <Button asChild className="w-full group-hover:bg-primary/90 transition-colors mt-auto">
                      <Link to={module.href} className="flex items-center justify-center gap-2">
                        Access Module
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button> : <Button disabled className="w-full mt-auto">
                      Coming Soon
                    </Button>}
                </CardContent>
              </Card>;
        })}
        </div>

        {/* Quick Actions */}
        <Card>
          
          
        </Card>
      </div>
    </div>;
}