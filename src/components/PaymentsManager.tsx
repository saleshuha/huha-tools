import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PaymentForm } from './PaymentForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface Payment {
  id: string;
  platform: string;
  region: 'UAE' | 'KSA';
  amount: number;
  status: 'Unpaid' | 'Paid' | 'Reversed';
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export function PaymentsManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type the data properly to ensure region is correctly typed
      const typedPayments: Payment[] = (data || []).map(payment => ({
        ...payment,
        region: payment.region as 'UAE' | 'KSA',
        status: payment.status as 'Unpaid' | 'Paid' | 'Reversed'
      }));
      
      setPayments(typedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (newPayment: { platform: string; region: 'UAE' | 'KSA'; amount: number; status: 'Unpaid' | 'Paid' | 'Reversed'; payment_date?: string }) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          platform: newPayment.platform,
          region: newPayment.region,
          amount: newPayment.amount,
          status: newPayment.status,
          payment_date: newPayment.payment_date || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Type the returned data properly
      const typedPayment: Payment = {
        ...data,
        region: data.region as 'UAE' | 'KSA',
        status: data.status as 'Unpaid' | 'Paid' | 'Reversed'
      };

      setPayments(prev => [typedPayment, ...prev]);
      setShowForm(false);
      toast({
        title: "Success",
        description: "Payment record added successfully.",
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "Failed to add payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = async (id: string, status: Payment['status']) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setPayments(prev => prev.map(payment => 
        payment.id === id ? { ...payment, status } : payment
      ));
      
      toast({
        title: "Success",
        description: "Payment status updated successfully.",
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPayments(prev => prev.filter(payment => payment.id !== id));
      toast({
        title: "Success",
        description: "Payment record deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: "Failed to delete payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusCounts = () => {
    return payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<Payment['status'], number>);
  };

  const getMonthlyData = () => {
    const monthlyTotals: Record<string, number> = {};
    payments.forEach(payment => {
      const date = new Date(payment.payment_date || payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + payment.amount;
    });
    
    return Object.entries(monthlyTotals)
      .map(([month, amount]) => ({
        month,
        amount,
        amountSAR: amount * 1.02 // Convert AED to SAR (approximate rate)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const statusCounts = getStatusCounts();
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalAmountSAR = totalAmount * 1.02; // Convert AED to SAR
  const monthlyData = getMonthlyData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface p-6 ml-8">
        <div className="max-w-7xl mx-auto space-y-6 pl-4">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading payments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface p-6 ml-8">
      <div className="max-w-7xl mx-auto space-y-6 pl-4">
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <CardTitle className="text-sm font-medium">Total Amount (AED)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AED {totalAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount (SAR)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">SAR {totalAmountSAR.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
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

        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payment Trends</CardTitle>
            <CardDescription>Payment amounts by month in SAR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`SAR ${value.toLocaleString()}`, 'Amount']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="amountSAR" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
            <CardDescription>All payment records in table format</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No payment records yet.</p>
                <p className="text-sm text-muted-foreground">Click "Add Payment" to create your first record.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Amount (AED)</TableHead>
                    <TableHead>Amount (SAR)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.platform}</TableCell>
                      <TableCell>{payment.region}</TableCell>
                      <TableCell>AED {payment.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">SAR {(payment.amount * 1.02).toLocaleString('en-US', { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Select 
                          value={payment.status} 
                          onValueChange={(value) => updatePaymentStatus(payment.id, value as Payment['status'])}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unpaid">
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Unpaid</Badge>
                            </SelectItem>
                            <SelectItem value="Paid">
                              <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>
                            </SelectItem>
                            <SelectItem value="Reversed">
                              <Badge variant="secondary" className="bg-red-100 text-red-800">Reversed</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {payment.payment_date 
                          ? new Date(payment.payment_date).toLocaleDateString() 
                          : 'Not set'
                        }
                      </TableCell>
                      <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePayment(payment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}