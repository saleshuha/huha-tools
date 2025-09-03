import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Send, 
  Truck, 
  MapPin, 
  AlertTriangle,
  Eye,
  ExternalLink 
} from 'lucide-react';
import { useNoonOrders, NoonOrder } from '@/hooks/useNoonOrders';
import { useToast } from '@/hooks/use-toast';

const PIPELINE_STAGES = {
  uploaded: { label: 'Uploaded', icon: Package, color: 'bg-secondary text-secondary-foreground' },
  validated: { label: 'Validated', icon: CheckCircle, color: 'bg-emerald/10 text-emerald border-emerald/20' },
  ready_for_sunsky: { label: 'Ready for Sunsky', icon: Clock, color: 'bg-sky/10 text-sky border-sky/20' },
  placed: { label: 'Placed', icon: Send, color: 'bg-cyan/10 text-cyan border-cyan/20' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-primary/10 text-primary border-primary/20' },
  delivered: { label: 'Delivered', icon: MapPin, color: 'bg-success/10 text-success border-success/20' },
  exception: { label: 'Exceptions', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

interface OrderCardProps {
  order: NoonOrder;
  onView: (order: NoonOrder) => void;
}

function OrderCard({ order, onView }: OrderCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`glass-container p-3 cursor-move hover:shadow-medium transition-all ${
        isDragging ? 'opacity-50 rotate-3' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {order.image_key && (
          <div className="flex-shrink-0">
            <img
              src={`https://f.nooncdn.com/p/${order.image_key}.jpg`}
              alt={order.title || "Product"}
              className="w-12 h-12 object-cover rounded border"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-medium truncate">{order.order_nr}</p>
              <p className="text-xs text-muted-foreground truncate">{order.title}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {order.quantity}
            </Badge>
          </div>
          
          <div className="mt-2 flex items-center justify-between">
            <div className="flex gap-1">
              {order.partner_sku && (
                <Badge variant="outline" className="text-[10px] px-1">
                  {order.partner_sku}
                </Badge>
              )}
              {order.sunsky_order_number && (
                <Badge variant="outline" className="text-[10px] px-1 bg-success/10 text-success">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {order.sunsky_order_number}
                </Badge>
              )}
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onView(order);
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PipelineColumnProps {
  stage: keyof typeof PIPELINE_STAGES;
  orders: NoonOrder[];
  onView: (order: NoonOrder) => void;
}

function PipelineColumn({ stage, orders, onView }: PipelineColumnProps) {
  const stageConfig = PIPELINE_STAGES[stage];
  const Icon = stageConfig.icon;

  return (
    <Card className="h-fit min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{stageConfig.label}</span>
          <Badge variant="secondary" className="ml-auto flex-shrink-0">
            {orders.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
            {orders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onView={onView}
              />
            ))}
            {orders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No orders in this stage
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

interface NoonOrderPipelineProps {
  orders: NoonOrder[];
  onOrderView: (order: NoonOrder) => void;
}

export function NoonOrderPipeline({ orders, onOrderView }: NoonOrderPipelineProps) {
  const { updateOrderStatus } = useNoonOrders();
  const { toast } = useToast();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const ordersByStage = React.useMemo(() => {
    const grouped: Record<string, NoonOrder[]> = {};
    
    Object.keys(PIPELINE_STAGES).forEach(stage => {
      grouped[stage] = orders.filter(order => {
        // Map order status to pipeline stages with better defaults
        const status = order.order_status || 'uploaded';
        
        if (stage === 'uploaded' && (status === 'uploaded' || !status || status === 'pending')) return true;
        if (stage === 'validated' && status === 'validated') return true;
        if (stage === 'ready_for_sunsky' && status === 'ready_for_sunsky') return true;
        if (stage === 'placed' && (status === 'placed' || order.sunsky_order_number)) return true;
        if (stage === 'shipped' && (status === 'shipped' || order.sunsky_tracking_number)) return true;
        if (stage === 'delivered' && status === 'delivered') return true;
        if (stage === 'exception' && (status === 'exception' || order.sunsky_error_message)) return true;
        
        return false;
      });
    });
    
    return grouped;
  }, [orders]);

  const validateStageTransition = (orderId: string, newStage: string): boolean => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    // Business rules for stage transitions
    if (newStage === 'placed' && !order.partner_sku) {
      toast({
        title: 'Cannot place order',
        description: 'Order must have a partner SKU before placing with Sunsky',
        variant: 'destructive',
      });
      return false;
    }

    if (newStage === 'shipped' && !order.sunsky_order_number) {
      toast({
        title: 'Cannot mark as shipped',
        description: 'Order must be linked to a Sunsky order first',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const orderId = active.id as string;
    const newStage = over.id as string;

    if (!validateStageTransition(orderId, newStage)) return;

    try {
      await updateOrderStatus(orderId, { order_status: newStage });
      toast({
        title: 'Order updated',
        description: `Order moved to ${PIPELINE_STAGES[newStage as keyof typeof PIPELINE_STAGES]?.label}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Pipeline Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Order Pipeline</h3>
          <p className="text-sm text-muted-foreground">
            Orders automatically progress through stages - manual dragging also supported
          </p>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>Total: {orders.length}</span>
        </div>
      </div>

      {/* Pipeline Columns */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col space-y-4">
          {/* First Row: Main Processing Stages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['uploaded', 'validated', 'ready_for_sunsky', 'placed'].map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage as keyof typeof PIPELINE_STAGES}
                orders={ordersByStage[stage] || []}
                onView={onOrderView}
              />
            ))}
          </div>
          
          {/* Second Row: Final Stages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {['shipped', 'delivered', 'exception'].map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage as keyof typeof PIPELINE_STAGES}
                orders={ordersByStage[stage] || []}
                onView={onOrderView}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className="glass-container p-3 rotate-3 shadow-strong">
              <OrderCard order={activeOrder} onView={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}