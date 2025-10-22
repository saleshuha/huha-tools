import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Download, Search, AlertTriangle, BarChart3, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Credential {
  id: string;
  name: string;
}

interface TrackingToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCredentials: string | null;
  onCredentialsChange: (value: string | null) => void;
  onSyncOrders: () => void;
  onClearOrders?: () => void;
  onExport?: () => void;
  onShowAnalytics?: () => void;
  loading: boolean;
  syncing: boolean;
  progressCurrent?: number;
  progressTotal?: number;
  progressPercent?: number;
  totalOrders: number;
  filteredOrders: number;
  delayedCount: number;
  credentials: Credential[];
}

export function TrackingToolbar({
  searchTerm,
  onSearchChange,
  selectedCredentials,
  onCredentialsChange,
  onSyncOrders,
  onClearOrders,
  onExport,
  onShowAnalytics,
  loading,
  syncing,
  progressCurrent = 0,
  progressTotal = 0,
  progressPercent = 0,
  totalOrders,
  filteredOrders,
  delayedCount,
  credentials
}: TrackingToolbarProps) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b shadow-soft">
      <div className="container mx-auto px-6 py-4">
        {/* Primary toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders, tracking numbers, SKUs..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-80 bg-card border-border/50 focus:border-primary"
              />
            </div>

            <Select value={selectedCredentials || 'all'} onValueChange={(val) => onCredentialsChange(val === 'all' ? null : val)}>
              <SelectTrigger className="w-56 bg-card border-border/50">
                <SelectValue placeholder="All Credentials" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">All Credentials</SelectItem>
                {credentials.map((cred) => (
                  <SelectItem key={cred.id} value={cred.id}>
                    {cred.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {delayedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="relative border-warning text-warning hover:bg-warning/10"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delayed Items
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                  {delayedCount}
                </Badge>
              </Button>
            )}

            {onShowAnalytics && (
              <Button variant="outline" size="sm" onClick={onShowAnalytics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            )}

            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onSyncOrders}
              disabled={syncing || loading}
              className="relative min-w-[140px]"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
              {syncing && progressTotal > 0 ? (
                <span className="flex items-center gap-2">
                  Syncing
                  <span className="font-mono text-xs">
                    {progressCurrent}/{progressTotal}
                  </span>
                </span>
              ) : (
                "Sync Orders"
              )}
              {syncing && progressTotal > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 rounded-b overflow-hidden">
                  <div 
                    className="h-full bg-primary-foreground transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </Button>

            {onClearOrders && totalOrders > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onClearOrders}
                disabled={syncing || loading}
              >
                Clear All Orders
              </Button>
            )}
          </div>
        </div>

        {/* Secondary toolbar - metrics */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            Showing {filteredOrders.toLocaleString()} of {totalOrders.toLocaleString()} orders
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="animate-fade-in">
              {totalOrders.toLocaleString()} Total
            </Badge>
            <Badge variant="outline" className="animate-fade-in">
              {filteredOrders.toLocaleString()} Filtered
            </Badge>
            {delayedCount > 0 && (
              <Badge variant="destructive" className="animate-bounce-in">
                {delayedCount} Delayed
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
