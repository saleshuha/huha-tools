import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, Plus, Search, Download, Upload, RefreshCw, Mail, Filter, 
  Grid3X3, List, SortAsc, SortDesc, Eye, Settings, TrendingUp, 
  TrendingDown, Zap, Clock, Star, AlertTriangle, CheckCircle,
  BarChart3, Archive, Edit3, Trash2, Activity, Target, Sparkles,
  ArrowRight, ChevronDown, Users, DollarSign, ShoppingCart,
  Layers, FileText, Calendar, Globe, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryDashboardProps {
  type: 'asin' | 'sku';
  inventory: any[];
  loading: boolean;
  onAddItem: (item: any) => void;
  onBulkAdd: (items: any[]) => void;
  onExport: () => void;
  onRefresh: () => void;
  onEmailReport: () => void;
  children: React.ReactNode;
}

export function InventoryDashboard({ 
  type, 
  inventory, 
  loading, 
  onAddItem, 
  onBulkAdd, 
  onExport, 
  onRefresh, 
  onEmailReport,
  children 
}: InventoryDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [quickFilter, setQuickFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { toast } = useToast();

  // Calculate enhanced metrics
  const metrics = useMemo(() => {
    const total = inventory.length;
    const inStock = inventory.filter(item => item.status === 'in-stock').length;
    const sold = inventory.filter(item => item.status === 'sold').length;
    const lowStock = inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length;
    const outOfStock = inventory.filter(item => item.quantity === 0).length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0);
    
    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentItems = inventory.filter(item => new Date(item.dateAdded) >= sevenDaysAgo).length;

    // Performance metrics
    const averageValue = total > 0 ? totalValue / total : 0;
    const stockPercentage = total > 0 ? (inStock / total) * 100 : 0;
    const turnoverRate = total > 0 ? (sold / total) * 100 : 0;

    return { 
      total, inStock, sold, lowStock, outOfStock, totalValue, recentItems,
      averageValue, stockPercentage, turnoverRate
    };
  }, [inventory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="relative">
          {/* Animated Background */}
          <div className="absolute inset-0 -m-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>
          
          {/* Loading Content */}
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-12 border border-white/50 dark:border-slate-700/50 shadow-2xl">
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <div className="w-24 h-24 border-8 border-purple-200 dark:border-purple-800 rounded-full animate-spin border-t-purple-600 dark:border-t-purple-400"></div>
                <div className="absolute inset-0 w-24 h-24 border-8 border-transparent rounded-full animate-ping border-t-pink-500"></div>
              </div>
              
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Loading Your Inventory
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  Fetching your {type.toUpperCase()} inventory data...
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-[98vw] mx-auto p-6 lg:p-10 space-y-12">
        
        {/* Hero Header Section */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-800/50 backdrop-blur-2xl border border-white/30 dark:border-slate-700/30 shadow-2xl">
          {/* Header Background Pattern */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(120,119,198,0.15),transparent_70%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,119,198,0.15),transparent_70%)]"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-slate-700/10"></div>
          </div>
          
          <div className="relative z-10 p-12">
            {/* Header Content */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-10 mb-12">
              <div className="flex items-center gap-8">
                {/* Icon with Glow Effect */}
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                  <div className="relative w-28 h-28 bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:scale-105">
                    {type === 'asin' ? (
                      <Package className="w-14 h-14 text-white drop-shadow-lg" />
                    ) : (
                      <Archive className="w-14 h-14 text-white drop-shadow-lg" />
                    )}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/20 to-transparent"></div>
                  </div>
                </div>
                
                {/* Title Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-6xl font-black bg-gradient-to-r from-slate-900 via-purple-800 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent">
                      {type === 'asin' ? 'ASIN' : 'SKU'}
                    </h1>
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 text-lg font-bold">
                      INVENTORY
                    </Badge>
                  </div>
                  <p className="text-2xl text-slate-600 dark:text-slate-300 font-semibold">
                    Next-Generation Inventory Management
                  </p>
                  
                  {/* Feature Pills */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {[
                      { icon: Activity, label: 'Real-time Analytics', color: 'emerald' },
                      { icon: Shield, label: 'Enterprise Security', color: 'blue' },
                      { icon: Globe, label: 'Global Scale', color: 'purple' },
                      { icon: Sparkles, label: 'AI-Powered', color: 'pink' }
                    ].map(({ icon: Icon, label, color }) => (
                      <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-2xl bg-${color}-100 dark:bg-${color}-900/30 border border-${color}-200 dark:border-${color}-700/50 text-${color}-700 dark:text-${color}-300`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onRefresh}
                  className="h-16 px-8 bg-white/80 dark:bg-slate-800/80 border-2 border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-500 group"
                >
                  <RefreshCw className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-700" />
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">Refresh</span>
                    <span className="text-xs text-slate-500">Update data</span>
                  </div>
                </Button>
                
                <Button
                  size="lg"
                  onClick={() => setIsAddDialogOpen(true)}
                  className="h-16 px-10 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:via-indigo-700 hover:to-pink-700 text-white shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-500 group border-0"
                >
                  <Plus className="w-6 h-6 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">Add New Item</span>
                    <span className="text-xs text-purple-200">Create inventory</span>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </div>
            </div>

            {/* Premium Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9 gap-6">
              <PremiumMetricCard
                title="Total Items"
                value={metrics.total}
                subtitle="All inventory"
                icon={<Package className="w-6 h-6" />}
                trend="neutral"
                gradient="from-blue-500 to-blue-600"
                glowColor="blue"
              />
              <PremiumMetricCard
                title="In Stock"
                value={metrics.inStock}
                subtitle={`${metrics.stockPercentage.toFixed(1)}% available`}
                icon={<CheckCircle className="w-6 h-6" />}
                trend="positive"
                gradient="from-emerald-500 to-emerald-600"
                glowColor="emerald"
              />
              <PremiumMetricCard
                title="Sold Items"
                value={metrics.sold}
                subtitle={`${metrics.turnoverRate.toFixed(1)}% turnover`}
                icon={<TrendingUp className="w-6 h-6" />}
                trend="positive"
                gradient="from-purple-500 to-purple-600"
                glowColor="purple"
              />
              <PremiumMetricCard
                title="Low Stock"
                value={metrics.lowStock}
                subtitle="Needs attention"
                icon={<AlertTriangle className="w-6 h-6" />}
                trend="warning"
                gradient="from-amber-500 to-amber-600"
                glowColor="amber"
              />
              <PremiumMetricCard
                title="Out of Stock"
                value={metrics.outOfStock}
                subtitle="Requires restock"
                icon={<Zap className="w-6 h-6" />}
                trend="negative"
                gradient="from-red-500 to-red-600"
                glowColor="red"
              />
              <PremiumMetricCard
                title="Recent Adds"
                value={metrics.recentItems}
                subtitle="Last 7 days"
                icon={<Clock className="w-6 h-6" />}
                trend="neutral"
                gradient="from-indigo-500 to-indigo-600"
                glowColor="indigo"
              />
              <PremiumMetricCard
                title="Total Value"
                value={`$${metrics.totalValue.toLocaleString()}`}
                subtitle="Portfolio value"
                icon={<DollarSign className="w-6 h-6" />}
                trend="positive"
                gradient="from-rose-500 to-rose-600"
                glowColor="rose"
              />
              <PremiumMetricCard
                title="Avg. Value"
                value={`$${metrics.averageValue.toFixed(0)}`}
                subtitle="Per item"
                icon={<Target className="w-6 h-6" />}
                trend="neutral"
                gradient="from-teal-500 to-teal-600"
                glowColor="teal"
              />
              <PremiumMetricCard
                title="Categories"
                value="12"
                subtitle="Active types"
                icon={<Layers className="w-6 h-6" />}
                trend="neutral"
                gradient="from-cyan-500 to-cyan-600"
                glowColor="cyan"
              />
            </div>
          </div>
        </div>

        {/* Advanced Control Panel */}
        <div className="relative overflow-hidden rounded-[2rem] bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5"></div>
          
          <div className="relative z-10 p-10">
            <div className="space-y-10">
              {/* Search Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      Search & Discovery
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Find exactly what you're looking for
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-6 items-end">
                  {/* Enhanced Search Input */}
                  <div className="flex-1 max-w-4xl">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
                      Search Inventory
                    </Label>
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                      <div className="relative">
                        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6 z-10" />
                        <Input
                          placeholder={`Search ${type.toUpperCase()} by name, code, description, or any detail...`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-16 pr-6 h-18 text-lg border-2 border-transparent bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl focus:border-purple-400 dark:focus:border-purple-500 ring-0 focus:ring-4 focus:ring-purple-500/20 transition-all duration-500 shadow-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-500"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {inventory.length} items
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* View Mode & Actions */}
                  <div className="flex items-end gap-4">
                    {/* View Toggle */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        View Mode
                      </Label>
                      <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-2 border border-slate-200/50 dark:border-slate-700/50">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="lg"
                          onClick={() => setViewMode('grid')}
                          className={cn(
                            "h-14 px-6 rounded-xl transition-all duration-300",
                            viewMode === 'grid' 
                              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30" 
                              : "hover:bg-white/70 dark:hover:bg-slate-700/70"
                          )}
                        >
                          <Grid3X3 className="w-5 h-5 mr-2" />
                          Grid
                        </Button>
                        <Button
                          variant={viewMode === 'table' ? 'default' : 'ghost'}
                          size="lg"
                          onClick={() => setViewMode('table')}
                          className={cn(
                            "h-14 px-6 rounded-xl transition-all duration-300",
                            viewMode === 'table' 
                              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30" 
                              : "hover:bg-white/70 dark:hover:bg-slate-700/70"
                          )}
                        >
                          <List className="w-5 h-5 mr-2" />
                          Table
                        </Button>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Actions
                      </Label>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={onExport}
                          className="h-14 px-6 bg-white/70 dark:bg-slate-800/70 border-2 border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-500 transition-all duration-500 group"
                        >
                          <Download className="w-5 h-5 mr-2 group-hover:translate-y-0.5 transition-transform duration-200" />
                          Export
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={onEmailReport}
                          className="h-14 px-6 bg-white/70 dark:bg-slate-800/70 border-2 border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-500 group"
                        >
                          <Mail className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                    <Filter className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      Smart Filters
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Quick access to common views
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: 'all', label: 'All Items', icon: Package, color: 'slate', count: metrics.total },
                    { id: 'in-stock', label: 'In Stock', icon: CheckCircle, color: 'emerald', count: metrics.inStock },
                    { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle, color: 'amber', count: metrics.lowStock },
                    { id: 'out-of-stock', label: 'Out of Stock', icon: Zap, color: 'red', count: metrics.outOfStock },
                    { id: 'recent', label: 'Recent', icon: Clock, color: 'indigo', count: metrics.recentItems },
                    { id: 'high-value', label: 'High Value', icon: Star, color: 'purple', count: 24 },
                  ].map((filter) => (
                    <Button
                      key={filter.id}
                      variant={quickFilter === filter.id ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => setQuickFilter(filter.id)}
                      className={cn(
                        "h-16 px-8 rounded-2xl border-2 transition-all duration-500 group relative overflow-hidden",
                        quickFilter === filter.id 
                          ? `bg-gradient-to-r from-${filter.color}-500 to-${filter.color}-600 text-white shadow-2xl shadow-${filter.color}-500/40 border-transparent scale-105` 
                          : `bg-white/70 dark:bg-slate-800/70 border-${filter.color}-200/50 dark:border-${filter.color}-700/50 hover:bg-${filter.color}-50 dark:hover:bg-${filter.color}-900/20 hover:border-${filter.color}-300 dark:hover:border-${filter.color}-500 hover:scale-105`
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <filter.icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-lg">{filter.label}</span>
                          <span className={cn(
                            "text-sm",
                            quickFilter === filter.id ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                          )}>
                            {filter.count} items
                          </span>
                        </div>
                      </div>
                      
                      {/* Hover effect */}
                      <div className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                        `bg-gradient-to-r from-${filter.color}-400/20 to-${filter.color}-600/20`
                      )}></div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}

interface PremiumMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend: 'positive' | 'negative' | 'neutral' | 'warning';
  gradient: string;
  glowColor: string;
}

function PremiumMetricCard({ title, value, subtitle, icon, trend, gradient, glowColor }: PremiumMetricCardProps) {
  const trendIcons = {
    positive: <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    negative: <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    neutral: <Activity className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
  };

  return (
    <div className="group relative">
      {/* Glow Effect */}
      <div className={cn(
        "absolute -inset-2 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-700",
        `bg-gradient-to-r ${gradient.replace('to-', 'to-')} opacity-30`
      )}></div>
      
      {/* Card */}
      <div className="relative h-full rounded-3xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 p-6 transition-all duration-700 hover:scale-105 hover:-translate-y-2 cursor-pointer shadow-xl hover:shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            {title}
          </div>
          <div className={cn(
            "p-3 rounded-2xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-all duration-500",
            gradient
          )}>
            <div className="text-white">
              {icon}
            </div>
          </div>
        </div>
        
        {/* Value */}
        <div className="mb-3">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-500">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {subtitle}
          </div>
          <div className="flex items-center gap-1">
            {trendIcons[trend]}
          </div>
        </div>
        
        {/* Gradient Line */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity duration-500",
          gradient
        )}></div>
      </div>
    </div>
  );
}