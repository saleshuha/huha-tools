import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Download, Filter, Search, AlertTriangle, BarChart3, Layout, Columns, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
interface TrackingToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStore: string;
  onStoreChange: (value: string) => void;
  selectedCredentials: string;
  onCredentialsChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onShowExceptions: () => void;
  onShowAnalytics: () => void;
  loading: boolean;
  totalOrders: number;
  filteredOrders: number;
  exceptionCount: number;
  stores: Array<{
    id: string;
    name: string;
    country: string;
  }>;
  credentials: Array<{
    id: string;
    name: string;
  }>;
}
export function TrackingToolbar({
  searchTerm,
  onSearchChange,
  selectedStore,
  onStoreChange,
  selectedCredentials,
  onCredentialsChange,
  onRefresh,
  onExport,
  onShowExceptions,
  onShowAnalytics,
  loading,
  totalOrders,
  filteredOrders,
  exceptionCount,
  stores,
  credentials
}: TrackingToolbarProps) {
  return <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b shadow-soft">
      <div className="container mx-auto px-6 py-4">
        {/* Primary toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search orders, SKUs, items..." value={searchTerm} onChange={e => onSearchChange(e.target.value)} className="pl-10 w-80 bg-card border-border/50 focus:border-primary" />
            </div>

            <Select value={selectedStore} onValueChange={onStoreChange}>
              <SelectTrigger className="w-48 bg-card border-border/50">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all-stores">All Stores</SelectItem>
                {stores.map(store => <SelectItem key={store.id} value={store.id}>
                    {store.name} ({store.country})
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedCredentials} onValueChange={onCredentialsChange}>
              <SelectTrigger className="w-48 bg-card border-border/50">
                <SelectValue placeholder="Sunsky Credentials" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="select-credentials">Select Credentials</SelectItem>
                {credentials.map(cred => <SelectItem key={cred.id} value={cred.id}>
                    {cred.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">

            <Button variant="outline" size="sm" onClick={onShowExceptions} className={cn("relative", exceptionCount > 0 && "border-warning text-warning hover:bg-warning/10")}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Exceptions
              {exceptionCount > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                  {exceptionCount}
                </Badge>}
            </Button>

            <Button variant="outline" size="sm" onClick={onShowAnalytics}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>

            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Secondary toolbar - metrics */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Showing {filteredOrders.toLocaleString()} of {totalOrders.toLocaleString()} orders
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="animate-fade-in">
              {totalOrders.toLocaleString()} Total
            </Badge>
            <Badge variant="outline" className="animate-fade-in">
              {filteredOrders.toLocaleString()} Filtered
            </Badge>
            {exceptionCount > 0 && <Badge variant="destructive" className="animate-bounce-in">
                {exceptionCount} Issues
              </Badge>}
          </div>
        </div>
      </div>
    </div>;
}