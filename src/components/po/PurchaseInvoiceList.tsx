import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, Download, Trash2, Receipt, Calendar, Building2, Package, Plus, X } from 'lucide-react';
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

interface NewInvoiceItem {
  asin: string;
  sku_code: string;
  title: string;
  quantity: number;
  unit_cost: number;
}

interface Supplier {
  id: string;
  supplier_name: string;
}

export const PurchaseInvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // New invoice form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [customSupplier, setCustomSupplier] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewInvoiceItem[]>([
    { asin: '', sku_code: '', title: '', quantity: 1, unit_cost: 0 }
  ]);

  const invoiceNumber = (() => {
    const date = format(new Date(), 'yyyyMMdd');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PI-${date}-${rand}`;
  })();

  useEffect(() => {
    fetchInvoices();
    fetchSuppliers();
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

  const fetchSuppliers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('supplier_name');
      setSuppliers(data || []);
    } catch {
      // silent
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
    const invoiceItems = Array.isArray(invoice.items) ? invoice.items : [];
    const doc = buildInvoicePDF(invoiceItems, {
      invoiceNumber: invoice.invoice_number,
      supplierName: invoice.supplier_name || '',
      supplierOrderNumber: invoice.supplier_order_number || '',
      notes: invoice.notes || '',
      date: format(new Date(invoice.invoice_date), 'dd MMM yyyy'),
    });
    doc.save(`${invoice.invoice_number}.pdf`);
    toast.success('PDF exported');
  };

  // -- Create invoice logic --
  const addItem = () => {
    setItems(prev => [...prev, { asin: '', sku_code: '', title: '', quantity: 1, unit_cost: 0 }]);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof NewInvoiceItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const getSupplierName = () => {
    if (selectedSupplierId === '__custom__') return customSupplier;
    return suppliers.find(s => s.id === selectedSupplierId)?.supplier_name || '';
  };

  const subtotal = items.reduce((s, item) => s + (item.quantity * item.unit_cost), 0);

  const handleCreateInvoice = async () => {
    const supplierName = getSupplierName();
    if (!supplierName.trim()) {
      toast.error('Please select or enter a supplier');
      return;
    }
    const validItems = items.filter(i => i.asin.trim() || i.title.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const invoiceItems = validItems.map(i => ({
        asin: i.asin,
        sku_code: i.sku_code,
        title: i.title,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
        total_cost: i.quantity * i.unit_cost,
        po_number: '',
        barcode: '',
      }));

      const total = invoiceItems.reduce((s, i) => s + i.total_cost, 0);

      const { error } = await supabase
        .from('purchase_invoices')
        .insert({
          invoice_number: invoiceNumber,
          supplier_name: supplierName,
          supplier_order_number: orderRef || null,
          invoice_date: new Date().toISOString().split('T')[0],
          items: invoiceItems as any,
          subtotal: total,
          total,
          notes: notes || null,
          user_id: user.id,
          status: 'finalized',
        });

      if (error) throw error;

      toast.success(`Invoice ${invoiceNumber} created`);
      setCreateOpen(false);
      resetForm();
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedSupplierId('');
    setCustomSupplier('');
    setOrderRef('');
    setNotes('');
    setItems([{ asin: '', sku_code: '', title: '', quantity: 1, unit_cost: 0 }]);
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
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-primary" />
              Invoices
              <Badge variant="secondary" className="text-[10px]">{invoices.length}</Badge>
            </CardTitle>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Create Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 opacity-40" />
              </div>
              <p className="font-medium text-sm">No invoices yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1.5 text-center max-w-xs">
                Click "Create Invoice" to generate your first standalone invoice.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {invoices.map(inv => {
                const itemCount = Array.isArray(inv.items) ? inv.items.length : 0;
                const totalQty = Array.isArray(inv.items) ? inv.items.reduce((s: number, i: any) => s + (i.quantity || 0), 0) : 0;
                return (
                  <div key={inv.id} className="relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow group">
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
                        <span className="text-lg font-bold">{(inv.total || 0).toFixed(2)} SAR</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleExportPDF(inv)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Export PDF">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(inv.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Delete invoice">
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

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
          <div className="bg-slate-800 dark:bg-slate-900 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span className="text-white font-bold text-lg tracking-tight">CREATE INVOICE</span>
                </div>
                <p className="text-slate-400 text-xs">Standalone invoice · SAR Currency</p>
              </div>
              <div className="text-right">
                <p className="text-white font-mono text-sm font-semibold">{invoiceNumber}</p>
                <p className="text-slate-400 text-xs mt-0.5">{format(new Date(), 'dd MMM yyyy')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)]">
            {/* Supplier & Order Ref */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">✏️ Enter manually</SelectItem>
                  </SelectContent>
                </Select>
                {selectedSupplierId === '__custom__' && (
                  <Input
                    value={customSupplier}
                    onChange={e => setCustomSupplier(e.target.value)}
                    placeholder="Supplier name"
                    className="h-8 text-sm mt-1"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Order Reference #</Label>
                <Input value={orderRef} onChange={e => setOrderRef(e.target.value)} placeholder="Optional reference" className="h-8 text-sm" />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Items</Label>
                <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>

              <div className="rounded-lg border overflow-hidden">
                {/* Header */}
                <div className="bg-muted/50 grid grid-cols-[1fr_80px_1.5fr_60px_80px_32px] gap-2 px-3 py-2">
                  {['ASIN', 'SKU', 'Title', 'Qty', 'Cost (SAR)', ''].map(h => (
                    <span key={h} className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">{h}</span>
                  ))}
                </div>
                <ScrollArea className="max-h-[240px]">
                  {items.map((item, idx) => (
                    <div key={idx} className={`grid grid-cols-[1fr_80px_1.5fr_60px_80px_32px] gap-2 px-3 py-1.5 border-b border-border/50 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                      <Input value={item.asin} onChange={e => updateItem(idx, 'asin', e.target.value)} placeholder="ASIN" className="h-7 text-xs" />
                      <Input value={item.sku_code} onChange={e => updateItem(idx, 'sku_code', e.target.value)} placeholder="SKU" className="h-7 text-xs" />
                      <Input value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} placeholder="Title" className="h-7 text-xs" />
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="h-7 text-xs" />
                      <Input type="number" min={0} step={0.01} value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} className="h-7 text-xs" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
                {/* Totals */}
                <div className="bg-muted/50 border-t px-3 py-2.5 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{items.length} items</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-base font-bold">{subtotal.toFixed(2)} SAR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Notes <span className="text-muted-foreground/50">(optional)</span></Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes or special instructions..." rows={2} className="text-sm resize-none" />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Save Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
