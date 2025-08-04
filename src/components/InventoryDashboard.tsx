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
  BarChart3, Archive, Edit3, Trash2, Activity, Target
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

  // Calculate metrics
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

    return { total, inStock, sold, lowStock, outOfStock, totalValue, recentItems };
  }, [inventory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent animate-pulse"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Loading Inventory</h3>
            <p className="text-muted-foreground animate-pulse">Fetching your {type.toUpperCase()} inventory data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-900/80">
      <div className="max-w-[98vw] mx-auto p-4 lg:p-8 space-y-10">
        
        {/* Hero Header Section with Glassmorphism */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/40 p-10 border border-white/20 dark:border-slate-700/50 backdrop-blur-xl shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-10">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25">
                    {type === 'asin' ? (
                      <Package className="w-10 h-10 text-white" />
                    ) : (
                      <Archive className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur animate-pulse"></div>
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-5xl font-black bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-white dark:via-purple-100 dark:to-white bg-clip-text text-transparent">
                    {type === 'asin' ? 'ASIN' : 'SKU'} Inventory
                  </h1>
                  <p className="text-xl text-slate-600 dark:text-slate-300 font-medium">
                    Premium inventory management experience
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      Real-time tracking
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      Advanced analytics
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onRefresh}
                  className="h-14 px-8 bg-white/50 dark:bg-slate-800/50 border-2 border-white/30 dark:border-slate-600/30 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-slate-700/70 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-500 group"
                >
                  <RefreshCw className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="font-semibold">Refresh</span>
                </Button>
                <Button
                  size="lg"
                  onClick={() => setIsAddDialogOpen(true)}
                  className="h-14 px-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-500 group border-0"
                >
                  <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="font-bold">Add New Item</span>
                </Button>
              </div>
            </div>

            {/* Enhanced Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
              <MetricCard
                title="Total Items"
                value={metrics.total}
                icon={<Package className="w-5 h-5" />}
                trend="neutral"
                className="bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent border border-blue-200/50 dark:border-blue-800/50 hover:shadow-blue-500/20"
              />
              <MetricCard
                title="In Stock"
                value={metrics.inStock}
                icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
                trend="positive"
                className="bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-transparent border border-emerald-200/50 dark:border-emerald-800/50 hover:shadow-emerald-500/20"
              />
              <MetricCard
                title="Sold"
                value={metrics.sold}
                icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                trend="positive"
                className="bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-transparent border border-purple-200/50 dark:border-purple-800/50 hover:shadow-purple-500/20"
              />
              <MetricCard
                title="Low Stock"
                value={metrics.lowStock}
                icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
                trend="warning"
                className="bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border border-amber-200/50 dark:border-amber-800/50 hover:shadow-amber-500/20"
              />
              <MetricCard
                title="Out of Stock"
                value={metrics.outOfStock}
                icon={<Zap className="w-5 h-5 text-red-600" />}
                trend="negative"
                className="bg-gradient-to-br from-red-500/10 via-red-400/5 to-transparent border border-red-200/50 dark:border-red-800/50 hover:shadow-red-500/20"
              />
              <MetricCard
                title="Recent Additions"
                value={metrics.recentItems}
                icon={<Clock className="w-5 h-5 text-indigo-600" />}
                trend="neutral"
                className="bg-gradient-to-br from-indigo-500/10 via-indigo-400/5 to-transparent border border-indigo-200/50 dark:border-indigo-800/50 hover:shadow-indigo-500/20"
              />
              <MetricCard
                title="Total Value"
                value={`$${metrics.totalValue.toLocaleString()}`}
                icon={<Target className="w-5 h-5 text-rose-600" />}
                trend="positive"
                className="bg-gradient-to-br from-rose-500/10 via-rose-400/5 to-transparent border border-rose-200/50 dark:border-rose-800/50 hover:shadow-rose-500/20"
              />
            </div>
          </div>
        </div>

        {/* Advanced Control Panel with Glassmorphism */}
        <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/30 dark:border-slate-700/30 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-pink-500/5"></div>
          <div className="relative z-10 p-8">
            <div className="space-y-8">
              {/* Enhanced Search Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-600" />
                  Search & Filter
                </h3>
                
                <div className="flex flex-col lg:flex-row gap-6 items-center">
                  <div className="relative flex-1 max-w-3xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur"></div>
                    <div className="relative">
                      <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" />
                      <Input
                        placeholder={`Search ${type.toUpperCase()} inventory by name, code, or description...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-16 pr-6 h-16 text-lg border-2 border-transparent bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl focus:border-purple-400 dark:focus:border-purple-500 ring-0 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 shadow-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Enhanced View Toggle */}
                    <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-2 border border-slate-200/50 dark:border-slate-700/50">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="lg"
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          "h-12 px-6 rounded-xl transition-all duration-300",
                          viewMode === 'grid' 
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                            : "hover:bg-white/50 dark:hover:bg-slate-700/50"
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
                          "h-12 px-6 rounded-xl transition-all duration-300",
                          viewMode === 'table' 
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg" 
                            : "hover:bg-white/50 dark:hover:bg-slate-700/50"
                        )}
                      >
                        <List className="w-5 h-5 mr-2" />
                        Table
                      </Button>
                    </div>
                    
                    {/* Action Buttons */}
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={onExport}
                      className="h-12 px-6 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-500 transition-all duration-300 group"
                    >
                      <Download className="w-5 h-5 mr-2 group-hover:translate-y-0.5 transition-transform duration-200" />
                      Export
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={onEmailReport}
                      className="h-12 px-6 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 group"
                    >
                      <Mail className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                      Email
                    </Button>
                  </div>
                </div>
              </div>

              {/* Enhanced Quick Filters */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Quick Filters
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'all', label: 'All Items', icon: Package, color: 'slate' },
                    { id: 'in-stock', label: 'In Stock', icon: CheckCircle, color: 'emerald' },
                    { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle, color: 'amber' },
                    { id: 'out-of-stock', label: 'Out of Stock', icon: Zap, color: 'red' },
                    { id: 'recent', label: 'Recent', icon: Clock, color: 'indigo' },
                  ].map((filter) => (
                    <Button
                      key={filter.id}
                      variant={quickFilter === filter.id ? 'default' : 'outline'}
                      size="lg"
                      onClick={() => setQuickFilter(filter.id)}
                      className={cn(
                        "h-12 px-6 rounded-2xl border-2 transition-all duration-300 group",
                        quickFilter === filter.id 
                          ? `bg-gradient-to-r from-${filter.color}-500 to-${filter.color}-600 text-white shadow-lg shadow-${filter.color}-500/30 border-transparent` 
                          : `bg-white/50 dark:bg-slate-800/50 border-${filter.color}-200/50 dark:border-${filter.color}-700/50 hover:bg-${filter.color}-50 dark:hover:bg-${filter.color}-900/20 hover:border-${filter.color}-300 dark:hover:border-${filter.color}-500`
                      )}
                    >
                      <filter.icon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: 'positive' | 'negative' | 'neutral' | 'warning';
  className?: string;
}

function MetricCard({ title, value, icon, trend, className }: MetricCardProps) {
  const trendIcons = {
    positive: <TrendingUp className="w-4 h-4 text-emerald-600" />,
    negative: <TrendingDown className="w-4 h-4 text-red-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    neutral: null,
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 p-6 transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 cursor-pointer group",
      className
    )}>
      {/* Gradient Background */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            {title}
          </div>
          <div className="p-2 rounded-xl bg-gradient-to-br from-white/50 to-white/20 dark:from-slate-700/50 dark:to-slate-700/20 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-300">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold">
            {trendIcons[trend]}
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
    </div>
  );
}