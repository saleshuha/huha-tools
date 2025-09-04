import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Truck, 
  Package,
  ExternalLink,
  MoreVertical
} from 'lucide-react';
import { NoonOrder } from '@/hooks/useNoonOrders';
import { cn } from '@/lib/utils';

interface EnhancedOrdersPipelineProps {
  orders: NoonOrder[];
  onOrderMove: (orderId: string, newStatus: string) => void;
  onOrderView: (order: NoonOrder) => void;
  className?: string;
}

const PIPELINE_STAGES = {
  uploaded: { 
    label: 'Uploaded', 
    icon: Upload, 
    color: 'border-sky/30 bg-sky/5',
    headerColor: 'bg-gradient-to-r from-sky/20 to-sky/10 text-sky-foreground',
    count: 0 
  },
  ready: { 
    label: 'Ready', 
    icon: CheckCircle, 
    color: 'border-emerald/30 bg-emerald/5',
    headerColor: 'bg-gradient-to-r from-emerald/20 to-emerald/10 text-emerald-foreground',
    count: 0 
  },
  placed: { 
    label: 'Placed', 
    icon: Clock, 
    color: 'border-primary/30 bg-primary/5',
    headerColor: 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary-foreground',
    count: 0 
  },
  shipped: { 
    label: 'Shipped', 
    icon: Truck, 
    color: 'border-cyan/30 bg-cyan/5',
    headerColor: 'bg-gradient-to-r from-cyan/20 to-cyan/10 text-cyan-foreground',
    count: 0 
  },
  delivered: { 
    label: 'Delivered', 
    icon: Package, 
    color: 'border-teal/30 bg-teal/5',
    headerColor: 'bg-gradient-to-r from-teal/20 to-teal/10 text-teal-foreground',
    count: 0 
  },
  exception: { 
    label: 'Issues', 
    icon: AlertCircle, 
    color: 'border-destructive/30 bg-destructive/5',
    headerColor: 'bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive-foreground',
    count: 0 
  }
};

interface DraggableOrderCardProps {
  order: NoonOrder;
  onView: (order: NoonOrder) => void;
}

function DraggableOrderCard({ order, onView }: DraggableOrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'uploaded': return 'secondary';
      case 'ready': return 'default';
      case 'placed': return 'outline';
      case 'shipped': return 'default';
      case 'delivered': return 'default';
      case 'exception': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab hover:shadow-medium transition-all duration-200 border-border/50 group",
        isDragging && "opacity-50 cursor-grabbing shadow-strong scale-105 rotate-2"
      )}
    >
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {order.title || 'Untitled Order'}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                Order: {order.order_nr}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView(order);
              }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {/* Order Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">SKU:</span>
              <span className="font-mono text-foreground">{order.partner_sku || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Qty:</span>
              <span className="font-semibold text-foreground">{order.quantity}</span>
            </div>
            {order.sunsky_order_number && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sunsky:</span>
                <span className="font-mono text-foreground text-xs">{order.sunsky_order_number}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <Badge 
              variant={getStatusBadgeVariant(order.order_status || 'uploaded')} 
              className="text-xs"
            >
              {order.order_status || 'uploaded'}
            </Badge>
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-muted-foreground" />
              <div className="h-1 w-1 rounded-full bg-muted-foreground" />
              <div className="h-1 w-1 rounded-full bg-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PipelineColumnProps {
  stage: string;
  orders: NoonOrder[];
  onOrderView: (order: NoonOrder) => void;
}

function PipelineColumn({ stage, orders, onOrderView }: PipelineColumnProps) {
  const config = PIPELINE_STAGES[stage as keyof typeof PIPELINE_STAGES];
  const Icon = config.icon;

  return (
    <Card className={cn("flex flex-col h-full border-border/50", config.color)}>
      <CardHeader className={cn("pb-3 rounded-t-lg border-b border-border/30", config.headerColor)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-sm font-semibold">{config.label}</span>
          </div>
          <Badge variant="secondary" className="bg-background/50 text-xs">
            {orders.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3">
        <ScrollArea className="h-full">
          <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {orders.map((order) => (
                <DraggableOrderCard
                  key={order.id}
                  order={order}
                  onView={onOrderView}
                />
              ))}
              {orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 rounded-full bg-muted/30 mb-3">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No orders in this stage</p>
                </div>
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function EnhancedOrdersPipeline({ 
  orders, 
  onOrderMove, 
  onOrderView,
  className 
}: EnhancedOrdersPipelineProps) {
  const [activeOrderId, setActiveOrderId] = React.useState<string | null>(null);

  // Group orders by status
  const groupedOrders = React.useMemo(() => {
    const groups: Record<string, NoonOrder[]> = {
      uploaded: [],
      ready: [],
      placed: [],
      shipped: [],
      delivered: [],
      exception: []
    };

    orders.forEach(order => {
      const status = order.order_status || 'uploaded';
      if (groups[status]) {
        groups[status].push(order);
      } else {
        groups.uploaded.push(order); // Default fallback
      }
    });

    return groups;
  }, [orders]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveOrderId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrderId(null);

    if (over && active.id !== over.id) {
      const activeOrderId = active.id as string;
      const targetStage = over.id as string;
      
      // Validate if the stage exists
      if (PIPELINE_STAGES[targetStage as keyof typeof PIPELINE_STAGES]) {
        onOrderMove(activeOrderId, targetStage);
      }
    }
  };

  const activeOrder = activeOrderId 
    ? orders.find(order => order.id === activeOrderId)
    : null;

  return (
    <div className={cn("w-full", className)}>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6 min-h-[600px]">
          {Object.entries(groupedOrders).map(([stage, stageOrders]) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              orders={stageOrders}
              onOrderView={onOrderView}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrder && (
            <DraggableOrderCard
              order={activeOrder}
              onView={onOrderView}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}