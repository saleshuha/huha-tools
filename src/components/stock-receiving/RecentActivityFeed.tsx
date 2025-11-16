import { useState } from 'react';
import { Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrackedTabs } from '@/components/ui/tracked-tabs';
import { TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { HistoryItemCard } from './HistoryItemCard';
import { HistoryFilters, HistoryFilterOptions } from './HistoryFilters';
import { useReceivingHistory } from '@/hooks/useReceivingHistory';

interface ActivityItem {
  id: string;
  success: boolean;
  identifier: string;
  destination: string;
  quantity: number;
  printed: boolean;
  timestamp: Date;
  error?: string;
  template_type?: 'po' | 'inventory';
  country?: string;
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  onReprint?: (activity: ActivityItem) => void;
}

export function RecentActivityFeed({ 
  activities, 
  onReprint
}: RecentActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<'po' | 'inventory'>('po');
  const [filters, setFilters] = useState<HistoryFilterOptions>({});
  const [poPage, setPoPage] = useState(1);
  const [invPage, setInvPage] = useState(1);
  
  const {
    history: poHistory,
    isLoading: poLoading,
    totalPages: poTotalPages,
    poCount
  } = useReceivingHistory(20, poPage, 'po', filters);

  const {
    history: inventoryHistory,
    isLoading: invLoading,
    totalPages: invTotalPages,
    inventoryCount
  } = useReceivingHistory(20, invPage, 'inventory', filters);

  const handleFilterChange = (newFilters: HistoryFilterOptions) => {
    setFilters(newFilters);
    setPoPage(1);
    setInvPage(1);
  };

  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const showEllipsis = totalPages > 7;
    
    if (showEllipsis) {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push(-1); // Ellipsis marker
      }
      
      // Show pages around current
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push(-2); // Ellipsis marker
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    } else {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }
    
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          {pages.map((page, idx) => (
            page < 0 ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const totalHistory = poHistory.length + inventoryHistory.length;

  if (totalHistory === 0 && activities.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No activity yet. Start receiving items to see history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <HistoryFilters 
        onFilterChange={handleFilterChange}
        activeFilters={filters}
      />

      <TrackedTabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as 'po' | 'inventory')}
        category="Inventory"
        subcategory="Stock Receiving"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="po" className="gap-2">
            PO Fulfillments
            {poCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                {poCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            Inventory Receipts
            {inventoryCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                {inventoryCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="po">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 p-2">
              {poHistory.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No PO fulfillments yet</p>
                </div>
              ) : (
                <>
                  {poHistory.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      type="po"
                      onReprint={onReprint ? () => onReprint({
                        id: item.id,
                        success: item.success,
                        identifier: item.asin || item.sku_code || item.model_number || 'Unknown',
                        destination: `PO ${item.destination_details?.po_numbers?.join(', ') || ''}`,
                        quantity: item.quantity,
                        printed: item.printed,
                        timestamp: new Date(item.created_at),
                        template_type: 'po'
                      }) : undefined}
                    />
                  ))}
                </>
              )}
            </div>
            {renderPagination(poPage, poTotalPages, setPoPage)}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="inventory">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 p-2">
              {inventoryHistory.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No direct inventory receipts yet</p>
                </div>
              ) : (
                <>
                  {inventoryHistory.map((item) => (
                    <HistoryItemCard
                      key={item.id}
                      item={item}
                      type="inventory"
                      onReprint={onReprint ? () => onReprint({
                        id: item.id,
                        success: item.success,
                        identifier: item.asin || item.sku_code || item.model_number || 'Unknown',
                        destination: 'Inventory',
                        quantity: item.quantity,
                        printed: item.printed,
                        timestamp: new Date(item.created_at),
                        template_type: 'inventory'
                      }) : undefined}
                    />
                  ))}
                </>
              )}
            </div>
            {renderPagination(invPage, invTotalPages, setInvPage)}
          </ScrollArea>
        </TabsContent>
      </TrackedTabs>
    </div>
  );
}
