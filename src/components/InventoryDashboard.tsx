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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="max-w-[98vw] mx-auto p-4 lg:p-8 space-y-8">
        
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 p-8 border border-border/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                  {type === 'asin' ? (
                    <Package className="w-8 h-8 text-white" />
                  ) : (
                    <Archive className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {type === 'asin' ? 'ASIN' : 'SKU'} Inventory
                  </h1>
                  <p className="text-lg text-muted-foreground mt-1">
                    Advanced inventory management dashboard
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onRefresh}
                  className="border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="lg"
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <MetricCard
                title="Total Items"
                value={metrics.total}
                icon={<Package className="w-5 h-5" />}
                trend="neutral"
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800"
              />
              <MetricCard
                title="In Stock"
                value={metrics.inStock}
                icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                trend="positive"
                className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800"
              />
              <MetricCard
                title="Sold"
                value={metrics.sold}
                icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                trend="positive"
                className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800"
              />
              <MetricCard
                title="Low Stock"
                value={metrics.lowStock}
                icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
                trend="warning"
                className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800"
              />
              <MetricCard
                title="Out of Stock"
                value={metrics.outOfStock}
                icon={<Zap className="w-5 h-5 text-red-600" />}
                trend="negative"
                className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800"
              />
              <MetricCard
                title="Recent Additions"
                value={metrics.recentItems}
                icon={<Clock className="w-5 h-5 text-indigo-600" />}
                trend="neutral"
                className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-800"
              />
              <MetricCard
                title="Total Value"
                value={`$${metrics.totalValue.toLocaleString()}`}
                icon={<Target className="w-5 h-5 text-emerald-600" />}
                trend="positive"
                className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800"
              />
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-lg">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Search and View Controls */}
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 max-w-2xl">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder={`Search ${type.toUpperCase()} inventory...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-lg border-2 border-border focus:border-primary ring-0 focus:ring-2 focus:ring-primary/20 bg-background/80"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-muted/50 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="h-8 px-3"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="h-8 px-3"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button variant="outline" onClick={onExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  
                  <Button variant="outline" onClick={onEmailReport}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Items', icon: Package },
                  { id: 'in-stock', label: 'In Stock', icon: CheckCircle },
                  { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
                  { id: 'out-of-stock', label: 'Out of Stock', icon: Zap },
                  { id: 'recent', label: 'Recent', icon: Clock },
                ].map((filter) => (
                  <Button
                    key={filter.id}
                    variant={quickFilter === filter.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuickFilter(filter.id)}
                    className={cn(
                      "transition-all duration-200",
                      quickFilter === filter.id && "shadow-lg"
                    )}
                  >
                    <filter.icon className="w-4 h-4 mr-2" />
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
    positive: <TrendingUp className="w-3 h-3 text-green-600" />,
    negative: <TrendingDown className="w-3 h-3 text-red-600" />,
    warning: <AlertTriangle className="w-3 h-3 text-orange-600" />,
    neutral: null,
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {title}
          </div>
          {icon}
        </div>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {trendIcons[trend]}
        </div>
      </CardContent>
    </Card>
  );
}