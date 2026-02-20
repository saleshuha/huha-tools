import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Trash2, Receipt, Calendar, Building2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { buildInvoicePDF } from './PurchaseInvoiceGenerator';

interface Invoice {
  id: string;
  invoice_number: string;
  supplier_name: string | null;
  supplier_order_number: string | null;
  invoice_date: string;
  items: any[];
  subtotal: number;
  total: number;
  notes: string | null;
  status: string;
  created_at: string;
}

export const PurchaseInvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data || []) as Invoice[]);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('purchase_invoices').delete().eq('id', id);
      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success('Invoice deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleExportPDF = (invoice: Invoice) => {
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const doc = buildInvoicePDF(items, {
      invoiceNumber: invoice.invoice_number,
      supplierName: invoice.supplier_name || '',
      supplierOrderNumber: invoice.supplier_order_number || '',
      notes: invoice.notes || '',
      date: format(new Date(invoice.invoice_date), 'dd MMM yyyy'),
    });
    doc.save(`${invoice.invoice_number}.pdf`);
    toast.success('PDF exported');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-5 w-5 text-primary" />
          Purchase Invoices
          <Badge variant="secondary">{invoices.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium text-sm">No invoices yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1.5 text-center max-w-xs">
              Use the "Invoice" button on a purchase link to generate your first invoice.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {invoices.map(inv => {
              const itemCount = Array.isArray(inv.items) ? inv.items.length : 0;
              const totalQty = Array.isArray(inv.items) ? inv.items.reduce((s: number, i: any) => s + (i.quantity || 0), 0) : 0;
              return (
                <div
                  key={inv.id}
                  className="relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Card header stripe */}
                  <div className="bg-slate-800 dark:bg-slate-900 px-4 py-3 flex items-start justify-between">
                    <div>
                      <p className="text-white font-mono text-xs font-semibold leading-tight">{inv.invoice_number}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400 text-[10px]">{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 ${inv.status === 'finalized' ? 'bg-green-600/20 text-green-400 border-green-500/20' : 'bg-slate-600/20 text-slate-400 border-slate-500/20'}`}
                      variant="outline"
                    >
                      {inv.status}
                    </Badge>
                  </div>

                  {/* Card body */}
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{inv.supplier_name || <span className="text-muted-foreground italic text-xs">No supplier</span>}</span>
                    </div>
                    {inv.supplier_order_number && (
                      <p className="text-xs text-muted-foreground font-mono">Order: {inv.supplier_order_number}</p>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        <span>{itemCount} items · {totalQty} units</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-lg font-bold">${(inv.total || 0).toFixed(2)}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportPDF(inv)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Export PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(inv.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete invoice"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
