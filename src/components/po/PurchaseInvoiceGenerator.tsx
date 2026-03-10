import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FileText, Download, Loader2, DollarSign, Building2, Calendar, Hash, Package } from 'lucide-react';
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
  barcode?: string;
}

interface PurchaseInvoiceGeneratorProps {
  linkId: string;
  linkTitle?: string;
  onGenerated?: () => void;
}

export const buildInvoicePDF = (
  items: InvoiceItem[],
  meta: {
    invoiceNumber: string;
    supplierName: string;
    supplierOrderNumber: string;
    notes: string;
    linkTitle?: string;
    date: string;
  }
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 14;

  // ── Header band
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE INVOICE', margin, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('HUHA TOOLS', margin, 23);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(meta.invoiceNumber, pageW - margin, 14, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(meta.date, pageW - margin, 21, { align: 'right' });
  if (meta.linkTitle) {
    doc.text(meta.linkTitle, pageW - margin, 28, { align: 'right' });
  }

  // ── Bill To / Meta info cards
  const infoY = 44;
  const halfW = (pageW - margin * 2 - 6) / 2;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoY, halfW, 28, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO', margin + 4, infoY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(meta.supplierName || 'N/A', margin + 4, infoY + 13);

  if (meta.supplierOrderNumber) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Order #: ${meta.supplierOrderNumber}`, margin + 4, infoY + 20);
  }

  const col2X = margin + halfW + 6;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(col2X, infoY, halfW, 28, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('INVOICE DETAILS', col2X + 4, infoY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice #:`, col2X + 4, infoY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.invoiceNumber, col2X + 24, infoY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date:`, col2X + 4, infoY + 19);
  doc.text(meta.date, col2X + 24, infoY + 19);
  doc.text(`Currency:`, col2X + 4, infoY + 25);
  doc.setTextColor(21, 128, 61);
  doc.text('SAR', col2X + 24, infoY + 25);

  // ── Table
  const tableY = infoY + 34;
  const cols = { num: 14, asin: 22, sku: 47, title: 72, barcode: 108, po: 138, qty: 158, unit: 168, total: 183 };

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, tableY, pageW - margin * 2, 7, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('#', cols.num, tableY + 5);
  doc.text('ASIN', cols.asin, tableY + 5);
  doc.text('SKU', cols.sku, tableY + 5);
  doc.text('TITLE', cols.title, tableY + 5);
  doc.text('BARCODE', cols.barcode, tableY + 5);
  doc.text('PO#', cols.po, tableY + 5);
  doc.text('QTY', cols.qty, tableY + 5, { align: 'right' });
  doc.text('UNIT', cols.unit, tableY + 5, { align: 'right' });
  doc.text('TOTAL', cols.total, tableY + 5, { align: 'right' });

  const drawTableHeader = (hy: number) => {
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, hy, pageW - margin * 2, 7, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('#', cols.num, hy + 5);
    doc.text('ASIN', cols.asin, hy + 5);
    doc.text('SKU', cols.sku, hy + 5);
    doc.text('TITLE', cols.title, hy + 5);
    doc.text('BARCODE', cols.barcode, hy + 5);
    doc.text('PO#', cols.po, hy + 5);
    doc.text('QTY', cols.qty, hy + 5, { align: 'right' });
    doc.text('UNIT', cols.unit, hy + 5, { align: 'right' });
    doc.text('TOTAL', cols.total, hy + 5, { align: 'right' });
  };

  let y = tableY + 7;
  const subtotal = items.reduce((s, i) => s + i.total_cost, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  items.forEach((item, idx) => {
    if (y > pageH - 40) {
      doc.addPage();
      drawTableHeader(14);
      y = 21;
    }

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, pageW - margin * 2, 5.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), cols.num, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.text(item.asin.substring(0, 10), cols.asin, y + 4);
    doc.text((item.sku_code || '').substring(0, 10), cols.sku, y + 4);
    doc.text((item.title || '').substring(0, 19), cols.title, y + 4);
    doc.setTextColor(37, 99, 235);
    doc.text((item.barcode || '—').substring(0, 14), cols.barcode, y + 4);
    doc.setTextColor(100, 116, 139);
    doc.text((item.po_number || '').substring(0, 10), cols.po, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.quantity), cols.qty, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.unit_cost.toFixed(2)}`, cols.unit, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.total_cost.toFixed(2)}`, cols.total, y + 4, { align: 'right' });

    y += 5.5;
  });

  // ── Totals section
  y += 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  const totalsX = pageW - margin - 60;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX - 4, y - 3, 64, 24, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsX, y + 4);
  doc.setTextColor(15, 23, 42);
  doc.text(`${subtotal.toFixed(2)} SAR`, pageW - margin, y + 4, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.text(`${items.length} items  |  ${totalQty} units`, totalsX, y + 10);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.4);
  doc.line(totalsX - 4, y + 13, pageW - margin, y + 13);
  doc.setLineWidth(0.2);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL:', totalsX, y + 20);
  doc.setTextColor(37, 99, 235);
  doc.text(`${subtotal.toFixed(2)} SAR`, pageW - margin, y + 20, { align: 'right' });

  // ── Notes
  if (meta.notes) {
    y += 28;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin, y, pageW - margin * 2, 16, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('NOTES', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 53, 15);
    const noteLines = doc.splitTextToSize(meta.notes, pageW - margin * 2 - 8);
    doc.text(noteLines[0] || '', margin + 4, y + 12);
  }

  // ── Footer band
  doc.setFillColor(30, 41, 59);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(meta.invoiceNumber, margin, pageH - 6);
  doc.text('Thank you for your business!', pageW - margin, pageH - 6, { align: 'right' });

  return doc;
};

export const PurchaseInvoiceGenerator = ({ linkId, linkTitle, onGenerated }: PurchaseInvoiceGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierOrderNumber, setSupplierOrderNumber] = useState('');
  const [notes, setNotes] = useState('');

  const invoiceNumber = (() => {
    const date = format(new Date(), 'yyyyMMdd');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PI-${date}-${rand}`;
  })();

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

      const asins = [...new Set((updates || []).map(u => u.asin).filter(Boolean))];
      let barcodeMap: Record<string, string> = {};

      if (asins.length > 0) {
        const { data: barcodes } = await supabase
          .from('product_barcodes')
          .select('asin, barcode')
          .in('asin', asins);
        if (barcodes) {
          barcodes.forEach(b => {
            if (b.asin && !barcodeMap[b.asin]) barcodeMap[b.asin] = b.barcode;
          });
        }
      }

      const invoiceItems: InvoiceItem[] = (updates || []).map(u => ({
        asin: u.asin || '',
        sku_code: u.sku_code || '',
        title: u.title || '',
        quantity: u.purchased_quantity || 0,
        unit_cost: parseFloat(u.unit_cost as any) || 0,
        total_cost: parseFloat(u.total_cost as any) || (u.purchased_quantity || 0) * (parseFloat(u.unit_cost as any) || 0),
        po_number: u.po_number || '',
        barcode: barcodeMap[u.asin || ''] || '',
      }));

      setItems(invoiceItems);
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
  const dateStr = format(new Date(), 'dd MMM yyyy');

  const getMeta = () => ({
    invoiceNumber,
    supplierName,
    supplierOrderNumber,
    notes,
    linkTitle,
    date: dateStr,
  });

  const handleSaveInvoice = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
      toast.success(`Invoice ${invoiceNumber} saved`);
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
    const doc = buildInvoicePDF(items, getMeta());
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
        <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
          <div className="bg-slate-800 dark:bg-slate-900 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span className="text-white font-bold text-lg tracking-tight">PURCHASE INVOICE</span>
                </div>
                <p className="text-slate-400 text-xs">HUHA TOOLS</p>
              </div>
              <div className="text-right">
                <p className="text-white font-mono text-sm font-semibold">{invoiceNumber}</p>
                <p className="text-slate-400 text-xs mt-0.5">{dateStr}</p>
                {linkTitle && (
                  <Badge className="mt-1 bg-blue-600/30 text-blue-300 border-blue-500/30 text-[10px]">
                    {linkTitle}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No cost data found</p>
                <p className="text-xs mt-1.5 text-muted-foreground/70">Suppliers need to enter unit costs via the purchase link first.</p>
              </div>
            ) : (
              <>
                {/* Bill To / Meta two-col */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Bill To</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Supplier Name</Label>
                        <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Enter supplier name" className="h-8 text-sm mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Order Reference #</Label>
                        <Input value={supplierOrderNumber} onChange={e => setSupplierOrderNumber(e.target.value)} placeholder="Enter order reference" className="h-8 text-sm mt-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-200/50 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-800/30 p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">Invoice Details</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> Number</span>
                        <span className="text-xs font-mono font-semibold">{invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</span>
                        <span className="text-xs">{dateStr}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Items</span>
                        <span className="text-xs">{items.length} lines / {totalQty} units</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-blue-200/50 dark:border-blue-800/30">
                        <span className="text-xs font-semibold">Total</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{subtotal.toFixed(2)} SAR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-primary grid grid-cols-[28px_90px_80px_1fr_80px_70px_48px_70px_70px] gap-x-2 px-3 py-2">
                    {['#', 'ASIN', 'SKU', 'Title', 'Barcode', 'PO#', 'Qty', 'Unit', 'Total'].map((h, i) => (
                      <span key={h} className={`text-[10px] font-bold text-white tracking-wider uppercase ${i >= 6 ? 'text-right' : ''}`}>{h}</span>
                    ))}
                  </div>
                  <ScrollArea className="max-h-[260px]">
                    {items.map((item, idx) => (
                      <div key={idx} className={`grid grid-cols-[28px_90px_80px_1fr_80px_70px_48px_70px_70px] gap-x-2 px-3 py-2 text-xs border-b border-border/50 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                        <span className="text-muted-foreground">{idx + 1}</span>
                        <span className="font-mono truncate text-[11px]">{item.asin}</span>
                        <span className="font-mono truncate text-[11px] text-muted-foreground">{item.sku_code || '-'}</span>
                        <span className="truncate">{item.title}</span>
                        <span className="font-mono truncate text-[11px] text-blue-600 dark:text-blue-400">{item.barcode || <span className="text-muted-foreground/50">—</span>}</span>
                        <span className="font-mono truncate text-muted-foreground text-[10px]">{item.po_number}</span>
                        <span className="text-right">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">{item.quantity}</Badge>
                        </span>
                        <span className="text-right font-mono text-muted-foreground">{item.unit_cost.toFixed(2)}</span>
                        <span className="text-right font-mono font-semibold">{item.total_cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </ScrollArea>
                  <div className="bg-muted/50 border-t px-3 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{items.length} line items · {totalQty} total units</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Subtotal</span>
                      <span className="text-base font-bold">{subtotal.toFixed(2)} SAR</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Notes <span className="text-muted-foreground/50">(optional)</span></Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any notes, terms, or special instructions..." rows={2} className="text-sm resize-none" />
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" onClick={handleExportPDF} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button onClick={handleSaveInvoice} disabled={generating} className="gap-1.5">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Save Invoice
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
