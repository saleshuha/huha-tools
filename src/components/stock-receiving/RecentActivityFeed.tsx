import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrackedTabs } from '@/components/ui/tracked-tabs';
import { TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  
  const {
    history: poHistory,
    isLoading: poLoading,
    loadMore: loadMorePO,
    hasMore: hasMorePO,
    poCount
  } = useReceivingHistory(50, 'po', filters);

  const {
    history: inventoryHistory,
    isLoading: invLoading,
    loadMore: loadMoreInv,
    hasMore: hasMoreInv,
    inventoryCount
  } = useReceivingHistory(50, 'inventory', filters);

  const handleFilterChange = (newFilters: HistoryFilterOptions) => {
    setFilters(newFilters);
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
                  
                  {hasMorePO && (
                    <div className="p-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadMorePO}
                        disabled={poLoading}
                      >
                        {poLoading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
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
                  
                  {hasMoreInv && (
                    <div className="p-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadMoreInv}
                        disabled={invLoading}
                      >
                        {invLoading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </TrackedTabs>
    </div>
  );
}
