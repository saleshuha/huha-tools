import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Calendar, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { useCurrencyDisplay } from '@/components/amazon/CurrencySelector';
import { usePaymentTerms } from '@/hooks/usePaymentTerms';

interface PaymentDetailsDialogProps {
  orders: any[];
}

export const PaymentDetailsDialog = ({ orders }: PaymentDetailsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { formatCurrency, convertCurrency } = useCurrencyConverter();
  const { displayCurrency } = useCurrencyDisplay();
  const { creditDays } = usePaymentTerms();

  const paymentDetails = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || !orders?.length) {
      return {
        overdue: { count: 0, value: 0, orders: [] },
        pending: { count: 0, value: 0, orders: [] },
        upcoming: { count: 0, value: 0, orders: [] },
        total: { count: 0, value: 0 }
      };
    }

    const now = new Date();
    const rangeStart = new Date(dateRange.from);
    const rangeEnd = new Date(dateRange.to);

    // Filter orders by payment due date within the selected range
    const ordersInRange = orders.filter(order => {
      if (!order.shipment_date) return false;
      try {
        const shipmentDate = new Date(order.shipment_date);
        const dueDate = new Date(shipmentDate);
        dueDate.setDate(dueDate.getDate() + creditDays);
        return dueDate >= rangeStart && dueDate <= rangeEnd;
      } catch {
        return false;
      }
    });

    const categorizeOrder = (order: any) => {
      const status = (order.status || '').toLowerCase().trim();
      const shipmentDate = new Date(order.shipment_date);
      const dueDate = new Date(shipmentDate);
      dueDate.setDate(dueDate.getDate() + creditDays);

      const cost = parseFloat(order.item_cost?.toString() || '0') || 0;
      const qty = parseInt(order.quantity?.toString() || '1') || 1;
      const orderValue = cost * qty;
      const convertedValue = convertCurrency(orderValue, order.currency || 'USD', displayCurrency);

      if (status === 'paid' || status === 'completed') {
        return { category: 'paid', value: convertedValue, order };
      } else if (dueDate < now && (status === 'approved' || status === 'non-submitted')) {
        return { category: 'overdue', value: convertedValue, order };
      } else if (status === 'approved' || status === 'non-submitted') {
        return { category: 'pending', value: convertedValue, order };
      } else {
        return { category: 'upcoming', value: convertedValue, order };
      }
    };

    const overdue = { count: 0, value: 0, orders: [] as any[] };
    const pending = { count: 0, value: 0, orders: [] as any[] };
    const upcoming = { count: 0, value: 0, orders: [] as any[] };

    ordersInRange.forEach(order => {
      const { category, value, order: orderData } = categorizeOrder(order);
      if (category === 'overdue') {
        overdue.count++;
        overdue.value += value;
        overdue.orders.push(orderData);
      } else if (category === 'pending') {
        pending.count++;
        pending.value += value;
        pending.orders.push(orderData);
      } else {
        upcoming.count++;
        upcoming.value += value;
        upcoming.orders.push(orderData);
      }
    });

    return {
      overdue,
      pending,
      upcoming,
      total: {
        count: overdue.count + pending.count + upcoming.count,
        value: overdue.value + pending.value + upcoming.value
      }
    };
  }, [dateRange, orders, creditDays, convertCurrency, displayCurrency]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Payment Details by Date
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payment Details by Date Range</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date Range:</label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full"
            />
          </div>

          {/* Payment Summary */}
          {dateRange?.from && dateRange?.to && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-destructive">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Overdue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {paymentDetails.overdue.count}
                    </div>
                    <div className="text-lg font-semibold text-destructive">
                      {formatCurrency(paymentDetails.overdue.value, displayCurrency)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-warning">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">
                      {paymentDetails.pending.count}
                    </div>
                    <div className="text-lg font-semibold text-warning">
                      {formatCurrency(paymentDetails.pending.value, displayCurrency)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Upcoming
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {paymentDetails.upcoming.count}
                    </div>
                    <div className="text-lg font-semibold text-primary">
                      {formatCurrency(paymentDetails.upcoming.value, displayCurrency)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-muted-foreground">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {paymentDetails.total.count}
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(paymentDetails.total.value, displayCurrency)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-4">
                {paymentDetails.overdue.orders.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-destructive">
                        Overdue Payments ({paymentDetails.overdue.orders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {paymentDetails.overdue.orders.map((order, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>{order.order_id}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">{order.status}</Badge>
                              <span className="font-medium">
                                {formatCurrency(
                                  convertCurrency(
                                    (parseFloat(order.item_cost?.toString() || '0') || 0) * 
                                    (parseInt(order.quantity?.toString() || '1') || 1),
                                    order.currency || 'USD',
                                    displayCurrency
                                  ),
                                  displayCurrency
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {paymentDetails.pending.orders.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-warning">
                        Pending Payments ({paymentDetails.pending.orders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {paymentDetails.pending.orders.map((order, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>{order.order_id}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{order.status}</Badge>
                              <span className="font-medium">
                                {formatCurrency(
                                  convertCurrency(
                                    (parseFloat(order.item_cost?.toString() || '0') || 0) * 
                                    (parseInt(order.quantity?.toString() || '1') || 1),
                                    order.currency || 'USD',
                                    displayCurrency
                                  ),
                                  displayCurrency
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {paymentDetails.upcoming.orders.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-primary">
                        Upcoming Payments ({paymentDetails.upcoming.orders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {paymentDetails.upcoming.orders.map((order, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>{order.order_id}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{order.status}</Badge>
                              <span className="font-medium">
                                {formatCurrency(
                                  convertCurrency(
                                    (parseFloat(order.item_cost?.toString() || '0') || 0) * 
                                    (parseInt(order.quantity?.toString() || '1') || 1),
                                    order.currency || 'USD',
                                    displayCurrency
                                  ),
                                  displayCurrency
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {(!dateRange?.from || !dateRange?.to) && (
            <div className="text-center py-8 text-muted-foreground">
              Please select a date range to view payment details
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};