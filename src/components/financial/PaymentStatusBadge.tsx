import { Badge } from '@/components/ui/badge';
import { PaymentStatus } from '@/types/financial';
import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export const PaymentStatusBadge = ({ status, className }: PaymentStatusBadgeProps) => {
  const getStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
        };
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
        };
      case 'partial':
        return {
          label: 'Partial',
          className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
        };
      case 'overdue':
        return {
          label: 'Overdue',
          className: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
};