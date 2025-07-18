import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Download, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { PaymentForm } from './PaymentForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  platform: string;
  store_name: string | null;
  region: 'UAE' | 'KSA';
  amount: number;
  status: 'Unpaid' | 'Paid' | 'Reversed';
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export function PaymentsManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, regionFilter, platformFilter]);

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

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.store_name && payment.store_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(payment => payment.region === regionFilter);
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter(payment => payment.platform === platformFilter);
    }

    setFilteredPayments(filtered);
  };

  const addPayment = async (newPayment: { platform: string; store_name?: string; region: 'UAE' | 'KSA'; amount: number; status: 'Unpaid' | 'Paid' | 'Reversed'; payment_date?: string }) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          platform: newPayment.platform,
          store_name: newPayment.store_name || null,
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
    return filteredPayments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<Payment['status'], number>);
  };

  const getCurrencyTotals = () => {
    const totals = { AED: 0, SAR: 0 };
    filteredPayments.forEach(payment => {
      if (payment.region === 'UAE') {
        totals.AED += payment.amount;
      } else if (payment.region === 'KSA') {
        totals.SAR += payment.amount;
      }
    });
    return totals;
  };

  const getAdvancedStats = () => {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    
    const currentMonthPayments = filteredPayments.filter(p => 
      new Date(p.created_at).getMonth() === currentMonth.getMonth() &&
      new Date(p.created_at).getFullYear() === currentMonth.getFullYear()
    );
    
    const lastMonthPayments = payments.filter(p => 
      new Date(p.created_at).getMonth() === lastMonth.getMonth() &&
      new Date(p.created_at).getFullYear() === lastMonth.getFullYear()
    );

    const currentMonthTotal = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const lastMonthTotal = lastMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const growth = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return {
      currentMonthTotal,
      lastMonthTotal,
      growth,
      avgPayment: filteredPayments.length > 0 ? currencyTotals.AED + currencyTotals.SAR / filteredPayments.length : 0,
      platformCount: new Set(filteredPayments.map(p => p.platform)).size
    };
  };

  const statusCounts = getStatusCounts();
  const currencyTotals = getCurrencyTotals();
  const advancedStats = getAdvancedStats();

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Platform,Store Name,Region,Amount,Currency,Status,Payment Date,Created Date\n"
      + filteredPayments.map(p => 
          `${p.platform},"${p.store_name || 'N/A'}",${p.region},${p.amount},${p.region === 'UAE' ? 'AED' : 'SAR'},${p.status},"${p.payment_date || 'N/A'}","${new Date(p.created_at).toLocaleDateString()}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Success",
      description: "Payment data exported successfully.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading payments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 glass-container animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              💳 Payment Analytics Hub
            </h1>
            <p className="text-muted-foreground text-lg">
              Advanced payment tracking and analytics across multiple platforms and regions
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4" />
              Add Payment
            </Button>
          </div>
        </div>

        {/* Advanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-fade-in">
          <Card className="glass-container hover-scale">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{filteredPayments.length}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {payments.length !== filteredPayments.length && `of ${payments.length} total`}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-container hover-scale">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">AED (UAE)</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {currencyTotals.AED.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">UAE Region</div>
            </CardContent>
          </Card>

          <Card className="glass-container hover-scale">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">SAR (KSA)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {currencyTotals.SAR.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">KSA Region</div>
            </CardContent>
          </Card>

          <Card className="glass-container hover-scale">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Growth</CardTitle>
                {advancedStats.growth >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${advancedStats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {advancedStats.growth >= 0 ? '+' : ''}{advancedStats.growth.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">vs last month</div>
            </CardContent>
          </Card>

          <Card className="glass-container hover-scale">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Platforms</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{advancedStats.platformCount}</div>
              <div className="text-sm text-muted-foreground mt-1">Active platforms</div>
            </CardContent>
          </Card>

          <Card className="glass-container hover-scale">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                  Unpaid: {statusCounts.Unpaid || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  Paid: {statusCounts.Paid || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                  Reversed: {statusCounts.Reversed || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters and Search */}
        <Card className="glass-container animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search platform or store..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Region</label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="UAE">UAE</SelectItem>
                    <SelectItem value="KSA">KSA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Platform</label>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {Array.from(new Set(payments.map(p => p.platform))).map(platform => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Actions</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setRegionFilter('all');
                    setPlatformFilter('all');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form Modal */}
        {showForm && (
          <Card className="glass-container border-2 border-primary animate-scale-in">
            <CardHeader>
              <CardTitle className="text-xl">Add New Payment Record</CardTitle>
              <CardDescription>
                Enter detailed payment information for comprehensive tracking
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

        {/* Enhanced Payments Table */}
        <Card className="glass-container animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl">Payment Records</CardTitle>
            <CardDescription>
              Comprehensive view of all payment transactions 
              {filteredPayments.length !== payments.length && ` (${filteredPayments.length} of ${payments.length} shown)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No payment records found</h3>
                <p className="text-muted-foreground mb-4">
                  {payments.length === 0 
                    ? "Start by adding your first payment record." 
                    : "Try adjusting your filters to see more results."
                  }
                </p>
                {payments.length === 0 && (
                  <Button onClick={() => setShowForm(true)} className="bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/50">
                      <TableHead className="font-semibold">Platform</TableHead>
                      <TableHead className="font-semibold">Store Name</TableHead>
                      <TableHead className="font-semibold">Region</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Payment Date</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            {payment.platform}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.store_name || (
                            <span className="italic text-muted-foreground/60">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={payment.region === 'UAE' ? 'border-blue-200 text-blue-700' : 'border-green-200 text-green-700'}>
                            {payment.region}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-semibold ${payment.region === 'UAE' ? 'text-blue-600' : 'text-green-600'}`}>
                          <div className="flex flex-col">
                            <span>{payment.region === 'UAE' ? 'AED' : 'SAR'} {payment.amount.toLocaleString()}</span>
                          </div>
                        </TableCell>
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
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  <span>Unpaid</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Paid">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span>Paid</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="Reversed">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  <span>Reversed</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.payment_date 
                            ? new Date(payment.payment_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : <span className="italic text-muted-foreground/60">Not set</span>
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePayment(payment.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                          >
                            <span className="sr-only">Delete payment</span>
                            🗑️
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}