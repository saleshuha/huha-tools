import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { PaymentForm } from './PaymentForm';
import { PaymentCard } from './PaymentCard';

export interface Payment {
  id: string;
  platform: string;
  region: 'UAE' | 'KSA';
  amount: number;
  status: 'Unpaid' | 'Paid' | 'Reversed';
  dateCreated: string;
}

export function PaymentsManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);

  const addPayment = (newPayment: Omit<Payment, 'id' | 'dateCreated'>) => {
    const payment: Payment = {
      ...newPayment,
      id: crypto.randomUUID(),
      dateCreated: new Date().toISOString(),
    };
    setPayments(prev => [payment, ...prev]);
    setShowForm(false);
  };

  const updatePaymentStatus = (id: string, status: Payment['status']) => {
    setPayments(prev => prev.map(payment => 
      payment.id === id ? { ...payment, status } : payment
    ));
  };

  const deletePayment = (id: string) => {
    setPayments(prev => prev.filter(payment => payment.id !== id));
  };

  const getStatusCounts = () => {
    return payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<Payment['status'], number>);
  };

  const statusCounts = getStatusCounts();
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Tracker</h1>
          <p className="text-muted-foreground">
            Track payments from e-commerce platforms across UAE and KSA
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Unpaid: {statusCounts.Unpaid || 0}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Paid: {statusCounts.Paid || 0}
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Reversed: {statusCounts.Reversed || 0}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form Modal */}
      {showForm && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Add New Payment</CardTitle>
            <CardDescription>
              Enter payment details for tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentForm 
              onSubmit={addPayment}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Payments List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payment Records</h2>
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No payment records yet.</p>
              <p className="text-sm text-muted-foreground">Click "Add Payment" to create your first record.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onStatusChange={updatePaymentStatus}
                onDelete={deletePayment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}