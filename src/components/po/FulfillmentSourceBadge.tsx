import { Badge } from '@/components/ui/badge';
import { Package, Inbox } from 'lucide-react';

interface FulfillmentSourceBadgeProps {
  source: 'receive_stock' | 'stock' | string;
  className?: string;
}

export const FulfillmentSourceBadge = ({ source, className }: FulfillmentSourceBadgeProps) => {
  if (source === 'receive_stock') {
    return (
      <Badge variant="default" className={className}>
        <Inbox className="w-3 h-3 mr-1" />
        Receive Stock
      </Badge>
    );
  }
  
  if (source === 'stock') {
    return (
      <Badge variant="secondary" className={className}>
        <Package className="w-3 h-3 mr-1" />
        From Stock
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className={className}>
      {source}
    </Badge>
  );
};
