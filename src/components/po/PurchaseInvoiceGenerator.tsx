import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Loader2, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface InvoiceItem {
  asin: string;
  sku_code: string;
  title: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  po_number: string;
}

interface PurchaseInvoiceGeneratorProps {
  linkId: string;
  linkTitle?: string;
  onGenerated?: () => void;
}

export const PurchaseInvoiceGenerator = ({ linkId, linkTitle, onGenerated }: PurchaseInvoiceGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierOrderNumber, setSupplierOrderNumber] = useState('');
  const [notes, setNotes] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data: updates, error } = await supabase
        .from('purchase_updates')
        .select('*')
        .eq('link_id', linkId)
        .not('unit_cost', 'is', null)
        .gt('purchased_quantity', 0);

      if (error) throw error;

      const invoiceItems: InvoiceItem[] = (updates || []).map(u => ({
        asin: u.asin || '',
        sku_code: u.sku_code || '',
        title: u.title || '',
        quantity: u.purchased_quantity || 0,
        unit_cost: parseFloat(u.unit_cost as any) || 0,
        total_cost: parseFloat(u.total_cost as any) || (u.purchased_quantity || 0) * (parseFloat(u.unit_cost as any) || 0),
        po_number: u.po_number || '',
      }));

      setItems(invoiceItems);

      // Auto-fill supplier from first update
      if (updates && updates.length > 0) {
        if (updates[0].supplier_name) setSupplierName(updates[0].supplier_name);
        if (updates[0].supplier_order_number) setSupplierOrderNumber(updates[0].supplier_order_number);
      }
    } catch (err) {
      console.error('Error fetching invoice items:', err);
      toast.error('Failed to load invoice items');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchItems();
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_cost, 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const generateInvoiceNumber = () => {
    const prefix = 'PI';
    const date = format(new Date(), 'yyyyMMdd');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${date}-${rand}`;
  };

  const handleSaveInvoice = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const invoiceNumber = generateInvoiceNumber();
      const { error } = await supabase
        .from('purchase_invoices')
        .insert({
          link_id: linkId,
          invoice_number: invoiceNumber,
          supplier_name: supplierName,
          supplier_order_number: supplierOrderNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          items: items as any,
          subtotal,
          total: subtotal,
          notes,
          user_id: user.id,
          status: 'finalized',
        });

      if (error) throw error;

      toast.success(`Invoice ${invoiceNumber} created`);
      onGenerated?.();
      setOpen(false);
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      toast.error('Failed to save invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const invoiceNumber = generateInvoiceNumber();

    // Header
    doc.setFontSize(20);
    doc.text('Purchase Invoice', 14, 22);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoiceNumber}`, 14, 32);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 14, 38);
    if (supplierName) doc.text(`Supplier: ${supplierName}`, 14, 44);
    if (supplierOrderNumber) doc.text(`Supplier Order #: ${supplierOrderNumber}`, 14, 50);
    if (linkTitle) doc.text(`Link: ${linkTitle}`, 14, 56);

    // Table header
    let y = 68;
    doc.setFontSize(8);
    doc.setFont(undefined as any, 'bold');
    const headers = ['#', 'ASIN', 'SKU', 'Title', 'PO#', 'Qty', 'Unit Cost', 'Total'];
    const colX = [14, 22, 48, 72, 120, 145, 158, 178];
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    
    doc.setFont(undefined as any, 'normal');
    y += 6;
    doc.line(14, y - 2, 196, y - 2);

    // Table rows
    items.forEach((item, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(idx + 1), 14, y);
      doc.text(item.asin.substring(0, 12), 22, y);
      doc.text((item.sku_code || '').substring(0, 12), 48, y);
      doc.text((item.title || '').substring(0, 24), 72, y);
      doc.text(item.po_number.substring(0, 12), 120, y);
      doc.text(String(item.quantity), 145, y);
      doc.text(`$${item.unit_cost.toFixed(2)}`, 158, y);
      doc.text(`$${item.total_cost.toFixed(2)}`, 178, y);
      y += 5;
    });

    // Totals
    y += 4;
    doc.line(14, y - 2, 196, y - 2);
    doc.setFont(undefined as any, 'bold');
    doc.text(`Total: ${totalQty} items`, 145, y + 2);
    doc.text(`$${subtotal.toFixed(2)}`, 178, y + 2);

    if (notes) {
      y += 12;
      doc.setFont(undefined as any, 'normal');
      doc.setFontSize(9);
      doc.text(`Notes: ${notes}`, 14, y);
    }

    doc.save(`${invoiceNumber}.pdf`);
    toast.success('PDF exported');
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        Invoice
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate Purchase Invoice
              {linkTitle && <Badge variant="secondary" className="text-xs">{linkTitle}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No items with cost data found.</p>
              <p className="text-xs mt-1">Suppliers need to enter unit costs via the purchase link first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Supplier Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Supplier Name</Label>
                  <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier name" />
                </div>
                <div>
                  <Label className="text-xs">Supplier Order #</Label>
                  <Input value={supplierOrderNumber} onChange={e => setSupplierOrderNumber(e.target.value)} placeholder="Order number" />
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>ASIN</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>PO#</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{item.asin}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku_code || '-'}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{item.title}</TableCell>
                        <TableCell className="font-mono text-xs">{item.po_number}</TableCell>
                        <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                        <TableCell className="text-right text-xs">${item.unit_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs font-medium">${item.total_cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={5} className="text-right text-xs">Totals:</TableCell>
                      <TableCell className="text-right text-xs">{totalQty}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right text-sm font-bold">${subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleExportPDF} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button onClick={handleSaveInvoice} disabled={generating} className="gap-1.5">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Save Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
