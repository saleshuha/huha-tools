import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, MapPin, Calendar } from 'lucide-react';
import type { Payment } from './PaymentsManager';

interface PaymentCardProps {
  payment: Payment;
  onStatusChange: (id: string, status: Payment['status']) => void;
  onDelete: (id: string) => void;
}

const statusColors = {
  Unpaid: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Paid: 'bg-green-100 text-green-800 border-green-200',
  Reversed: 'bg-red-100 text-red-800 border-red-200'
};

export function PaymentCard({ payment, onStatusChange, onDelete }: PaymentCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{payment.platform}</CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              {payment.region}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(payment.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-foreground">
            AED {payment.amount.toLocaleString()}
          </span>
          <Badge className={statusColors[payment.status]}>
            {payment.status}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Update Status</label>
            <Select
              value={payment.status}
              onValueChange={(value) => onStatusChange(payment.id, value as Payment['status'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Created: {formatDate(payment.created_at)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}