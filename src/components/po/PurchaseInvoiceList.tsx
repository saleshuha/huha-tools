import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
    const doc = new jsPDF();
    const items = Array.isArray(invoice.items) ? invoice.items : [];

    doc.setFontSize(20);
    doc.text('Purchase Invoice', 14, 22);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 14, 32);
    doc.text(`Date: ${format(new Date(invoice.invoice_date), 'dd MMM yyyy')}`, 14, 38);
    if (invoice.supplier_name) doc.text(`Supplier: ${invoice.supplier_name}`, 14, 44);
    if (invoice.supplier_order_number) doc.text(`Order #: ${invoice.supplier_order_number}`, 14, 50);

    let y = 62;
    doc.setFontSize(8);
    doc.setFont(undefined as any, 'bold');
    ['#', 'ASIN', 'SKU', 'Title', 'Qty', 'Unit Cost', 'Total'].forEach((h, i) => {
      doc.text(h, [14, 22, 48, 72, 140, 158, 178][i], y);
    });
    doc.setFont(undefined as any, 'normal');
    y += 6;

    items.forEach((item: any, idx: number) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(String(idx + 1), 14, y);
      doc.text((item.asin || '').substring(0, 12), 22, y);
      doc.text((item.sku_code || '').substring(0, 12), 48, y);
      doc.text((item.title || '').substring(0, 30), 72, y);
      doc.text(String(item.quantity || 0), 140, y);
      doc.text(`$${(item.unit_cost || 0).toFixed(2)}`, 158, y);
      doc.text(`$${(item.total_cost || 0).toFixed(2)}`, 178, y);
      y += 5;
    });

    y += 4;
    doc.setFont(undefined as any, 'bold');
    doc.text(`Total: $${(invoice.total || 0).toFixed(2)}`, 178, y, { align: 'right' });

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Purchase Invoices
          <Badge variant="secondary">{invoices.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No invoices generated yet. Use the "Invoice" button on a purchase link to create one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                  <TableCell className="text-xs">{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-xs">{inv.supplier_name || '-'}</TableCell>
                  <TableCell className="text-right text-xs">{Array.isArray(inv.items) ? inv.items.length : 0}</TableCell>
                  <TableCell className="text-right text-xs font-medium">${(inv.total || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'finalized' ? 'default' : 'secondary'} className="text-[10px]">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleExportPDF(inv)} className="h-7 w-7 p-0">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
