import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { List, Grid3X3, Filter, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickControlsBarProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  currentPage: number;
  totalCount: number;
  onAddItem?: () => void;
}

export function QuickControlsBar({
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  totalCount,
  onAddItem
}: QuickControlsBarProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl border border-border/60">
      {/* Status Filter Pill */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-1.5 border border-border/60 shadow-sm">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 border-0 bg-transparent p-0 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="no-stock">No Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center bg-background rounded-lg p-1 border border-border/60 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('table')}
          className={cn(
            'h-8 px-3 gap-2 rounded-md transition-all duration-200',
            viewMode === 'table' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'hover:bg-muted'
          )}
        >
          <List className="w-4 h-4" />
          <span className="text-sm font-medium">Table</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('grid')}
          className={cn(
            'h-8 px-3 gap-2 rounded-md transition-all duration-200',
            viewMode === 'grid' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'hover:bg-muted'
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="text-sm font-medium">Grid</span>
        </Button>
      </div>

      {/* Items Per Page */}
      <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-1.5 border border-border/60 shadow-sm">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">Show:</Label>
        <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
          <SelectTrigger className="w-16 h-8 border-0 bg-transparent p-0 focus:ring-0 focus:ring-offset-0 font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg">
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="150">150</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right Side Controls */}
      <div className="ml-auto flex items-center gap-3">
        {/* Results Counter */}
        <Badge 
          variant="secondary" 
          className="bg-primary/10 text-primary font-semibold px-3 py-1.5 text-sm"
        >
          {totalCount > 0 ? (
            <>
              {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalCount.toLocaleString()}
            </>
          ) : (
            'No results'
          )}
        </Badge>

        {/* Add Item Shortcut */}
        {onAddItem && (
          <Button
            onClick={onAddItem}
            size="sm"
            className="h-9 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Add Item</span>
          </Button>
        )}
      </div>
    </div>
  );
}
