import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CreditCard, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { toast } from "sonner";

interface PaymentSummary {
  totalInvoices: number;
  totalCredits: number;
  totalSales: number;
  totalVAT: number;
  totalCommission: number;
  totalShipping: number;
  netReceived: number;
  totalReturns: number;
}

const NoonPaymentData = () => {
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [creditData, setCreditData] = useState<any[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalInvoices: 0,
    totalCredits: 0,
    totalSales: 0,
    totalVAT: 0,
    totalCommission: 0,
    totalShipping: 0,
    netReceived: 0,
    totalReturns: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch invoice data
      const { data: invoices, error: invoiceError } = await supabase
        .from('noon_invoice_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (invoiceError) throw invoiceError;

      // Fetch credit data
      const { data: credits, error: creditError } = await supabase
        .from('noon_credit_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (creditError) throw creditError;

      setInvoiceData(invoices || []);
      setCreditData(credits || []);

      // Calculate summary
      calculateSummary(invoices || [], credits || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (invoices: any[], credits: any[]) => {
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.price_including_vat_doc_currency || 0), 0);
    const totalVAT = invoices.reduce((sum, inv) => sum + (inv.vat_amount_doc_currency || 0), 0);
    const totalCommission = invoices.reduce((sum, inv) => sum + (inv.commission_amount || 0), 0);
    const totalShipping = invoices.reduce((sum, inv) => sum + (inv.shipping_amount || 0), 0);
    const netReceived = invoices.reduce((sum, inv) => sum + (inv.net_amount_received || 0), 0);
    const totalReturns = credits.reduce((sum, cred) => sum + (cred.refund_amount || 0), 0);

    setSummary({
      totalInvoices: invoices.length,
      totalCredits: credits.length,
      totalSales,
      totalVAT,
      totalCommission,
      totalShipping,
      netReceived,
      totalReturns
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-AE');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalSales)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">VAT Paid</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalVAT)}</p>
              </div>
              <Percent className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Received</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.netReceived)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Returns</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalReturns)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Data ({summary.totalInvoices})
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Credit Data ({summary.totalCredits})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice/Payment Records</CardTitle>
              <CardDescription>
                Detailed view of all invoice and payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoiceData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Sales Amount</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Net Received</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceData.slice(0, 50).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{formatDate(invoice.document_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invoice.invoice_nr || '-'}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{invoice.sku || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate" title={invoice.description}>
                            {invoice.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.price_including_vat_doc_currency || 0)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(invoice.vat_amount_doc_currency || 0)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(invoice.commission_amount || 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(invoice.net_amount_received || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No invoice data available. Upload an invoice report to see data here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits">
          <Card>
            <CardHeader>
              <CardTitle>Credit/Return Records</CardTitle>
              <CardDescription>
                Detailed view of all credit notes and return transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {creditData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Credit Note #</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Credit Amount</TableHead>
                        <TableHead className="text-right">Return Charges</TableHead>
                        <TableHead className="text-right">Refund Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditData.slice(0, 50).map((credit) => (
                        <TableRow key={credit.id}>
                          <TableCell>{formatDate(credit.document_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{credit.credit_note_nr || '-'}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{credit.sku || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate" title={credit.description}>
                            {credit.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(credit.price_including_vat_doc_currency || 0)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {formatCurrency(credit.return_charges || 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(credit.refund_amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No credit data available. Upload a credit report to see data here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NoonPaymentData;