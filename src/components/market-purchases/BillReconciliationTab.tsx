import { useState, useMemo } from "react";
import {
  Plus, CheckCircle2, AlertTriangle, XCircle, Clock, FileText, DollarSign,
  Filter, ChevronDown, ChevronRight, Search, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSupplierBills, type LinkedItem } from "@/hooks/useSupplierBills";
import { useMarketPurchaseLinks } from "@/hooks/useMarketPurchaseLinks";
import { useMarketCreditPayments } from "@/hooks/useMarketCreditPayments";
import { NewBillDialog } from "./NewBillDialog";

const statusConfig: Record<string, { icon: React.ReactNode; dotColor: string; badgeClass: string; borderColor: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, dotColor: "bg-amber-500", badgeClass: "bg-amber-500/10 text-amber-700 border-amber-200", borderColor: "border-l-amber-500" },
  partial: { icon: <AlertTriangle className="h-3.5 w-3.5" />, dotColor: "bg-orange-500", badgeClass: "bg-orange-500/10 text-orange-700 border-orange-200", borderColor: "border-l-orange-500" },
  reconciled: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, dotColor: "bg-emerald-500", badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-200", borderColor: "border-l-emerald-500" },
  disputed: { icon: <XCircle className="h-3.5 w-3.5" />, dotColor: "bg-destructive", badgeClass: "bg-destructive/10 text-destructive border-destructive/20", borderColor: "border-l-destructive" },
};

interface SupplierItem {
  asin: string | null;
  sku: string | null;
  title: string | null;
  qty: number;
  unit_cost: number;
  link_id: string;
  link_title: string;
  link_date: string;
}

function ReconcileDialog({
  bill,
  open,
  onOpenChange,
  onReconcile,
  supplierItems,
}: {
  bill: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReconcile: (items: LinkedItem[], status: "reconciled" | "partial" | "disputed") => void;
  supplierItems: SupplierItem[];
}) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIndices.size === supplierItems.length) setSelectedIndices(new Set());
    else setSelectedIndices(new Set(supplierItems.map((_, i) => i)));
  };

  const selectedTotal = supplierItems
    .filter((_, i) => selectedIndices.has(i))
    .reduce((sum, item) => sum + item.qty * item.unit_cost, 0);

  const billAmount = Number(bill?.total_amount || 0);
  const variance = selectedTotal - billAmount;

  const handleReconcile = (status: "reconciled" | "partial" | "disputed") => {
    const items: LinkedItem[] = supplierItems
      .filter((_, i) => selectedIndices.has(i))
      .map((item) => ({
        link_id: item.link_id,
        asin: item.asin,
        sku: item.sku,
        title: item.title,
        qty: item.qty,
        unit_cost: item.unit_cost,
      }));
    onReconcile(items, status);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconcile Bill — {bill?.bill_reference || bill?.supplier_name || "Unnamed"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left: Bill Info */}
          <Card className="border border-border">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bill Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Reference:</span> <span className="font-medium">{bill?.bill_reference || "—"}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{bill?.bill_date ? format(new Date(bill.bill_date), "dd MMM yyyy") : "—"}</span></div>
                <div><span className="text-muted-foreground">Supplier:</span> <span className="font-medium">{bill?.supplier_name || bill?.supplier?.supplier_name || "Unknown"}</span></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-primary">{bill?.currency} {billAmount.toFixed(2)}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Variance */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Selected Total</p>
                <p className="text-xl font-bold text-foreground mt-1">AED {selectedTotal.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{selectedIndices.size} items selected</p>
              </CardContent>
            </Card>
            <Card className={cn("border", Math.abs(variance) < 0.01 ? "border-emerald-200 bg-emerald-500/5" : variance > 0 ? "border-destructive/20 bg-destructive/5" : "border-orange-200 bg-orange-500/5")}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Variance</p>
                <p className={cn("text-xl font-bold mt-1", Math.abs(variance) < 0.01 ? "text-emerald-600" : variance > 0 ? "text-destructive" : "text-orange-600")}>
                  {variance >= 0 ? "+" : ""}{variance.toFixed(2)}
                </p>
                {Math.abs(variance) > 0.01 && (
                  <p className="text-[10px] mt-1 text-muted-foreground">
                    {variance > 0 ? "Over bill amount" : "Under bill amount"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Items from purchase links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Purchase Link Items for this Supplier</p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={toggleAll}>
              {selectedIndices.size === supplierItems.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-8" />
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">ASIN/SKU</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Title</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Qty</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Unit Cost</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Total</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Link Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No items found for this supplier.
                    </TableCell>
                  </TableRow>
                ) : (
                  supplierItems.map((item, idx) => (
                    <TableRow
                      key={`${item.link_id}-${item.asin}-${idx}`}
                      className={cn("cursor-pointer transition-colors", selectedIndices.has(idx) ? "bg-primary/5" : "hover:bg-muted/20")}
                      onClick={() => toggle(idx)}
                    >
                      <TableCell>
                        <Checkbox checked={selectedIndices.has(idx)} onCheckedChange={() => toggle(idx)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.asin || item.sku || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{item.title || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{item.qty}</TableCell>
                      <TableCell className="text-sm">AED {item.unit_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-sm font-semibold">AED {(item.qty * item.unit_cost).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(item.link_date), "dd MMM")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={selectedIndices.size === 0} onClick={() => handleReconcile("disputed")}>
            <XCircle className="h-4 w-4 mr-1.5" /> Disputed
          </Button>
          <Button variant="outline" disabled={selectedIndices.size === 0} onClick={() => handleReconcile("partial")}>
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Partial
          </Button>
          <Button disabled={selectedIndices.size === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleReconcile("reconciled")}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Reconcile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillDetailDialog({
  bill,
  open,
  onOpenChange,
  supplierPayments,
}: {
  bill: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplierPayments: any[];
}) {
  const linkedItems = (bill?.linked_items || []) as LinkedItem[];
  const linkedTotal = linkedItems.reduce((s, i) => s + i.qty * i.unit_cost, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill Detail — {bill?.bill_reference || bill?.supplier_name || "Unnamed"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Bill Info</TabsTrigger>
            <TabsTrigger value="items">Matched Items ({linkedItems.length})</TabsTrigger>
            <TabsTrigger value="payments">Payments ({supplierPayments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Reference", bill?.bill_reference || "—"],
                ["Date", bill?.bill_date ? format(new Date(bill.bill_date), "dd MMM yyyy") : "—"],
                ["Supplier", bill?.supplier_name || bill?.supplier?.supplier_name || "Unknown"],
                ["Amount", `${bill?.currency} ${Number(bill?.total_amount || 0).toFixed(2)}`],
                ["Status", bill?.status],
                ["Reconciled", bill?.reconciled_at ? format(new Date(bill.reconciled_at), "dd MMM yyyy") : "Not yet"],
              ].map(([label, val]) => (
                <div key={label as string} className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{val}</p>
                </div>
              ))}
            </div>
            {bill?.notes && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm text-foreground mt-1">{bill.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            {linkedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No items matched yet. Reconcile this bill to link items.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">ASIN/SKU</TableHead>
                      <TableHead className="text-xs">Title</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">Unit Cost</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-mono">{item.asin || item.sku || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{item.title || "—"}</TableCell>
                        <TableCell className="text-sm">{item.qty}</TableCell>
                        <TableCell className="text-sm">AED {item.unit_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-sm font-semibold">AED {(item.qty * item.unit_cost).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={4} className="text-xs font-semibold text-right">Items Total</TableCell>
                      <TableCell className="text-sm font-bold">AED {linkedTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {supplierPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No payments recorded for this supplier.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-xs">Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPayments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-sm font-semibold text-emerald-600">AED {Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{p.payment_method}</TableCell>
                        <TableCell className="text-xs font-mono">{p.reference_number || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function BillReconciliationTab() {
  const { bills, isLoading, createBill, reconcileBill, deleteBill } = useSupplierBills();
  const { links } = useMarketPurchaseLinks();
  const { payments } = useMarketCreditPayments();

  const [newBillOpen, setNewBillOpen] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Build supplier items from purchase links
  const supplierItemsMap = useMemo(() => {
    const map: Record<string, SupplierItem[]> = {};
    (links || []).forEach((link) => {
      const items = Array.isArray(link.items) ? link.items : [];
      items.forEach((item: any) => {
        const name = item.supplier_name;
        if (!name) return;
        if (!map[name]) map[name] = [];
        map[name].push({
          asin: item.asin || null,
          sku: item.sku || null,
          title: item.title || null,
          qty: item.qty || 0,
          unit_cost: item.unit_cost || 0,
          link_id: link.id,
          link_title: link.title || "Untitled",
          link_date: link.created_at,
        });
      });
    });
    return map;
  }, [links]);

  const allSupplierNames = useMemo(() => {
    const names = new Set<string>();
    bills.forEach((b) => {
      const name = b.supplier_name || b.supplier?.supplier_name;
      if (name) names.add(name);
    });
    Object.keys(supplierItemsMap).forEach((n) => names.add(n));
    return Array.from(names).sort();
  }, [bills, supplierItemsMap]);

  const stats = useMemo(() => {
    const pending = bills.filter((b) => b.status === "pending").length;
    const partial = bills.filter((b) => b.status === "partial").length;
    const reconciled = bills.filter((b) => b.status === "reconciled").length;
    const disputed = bills.filter((b) => b.status === "disputed").length;
    const totalOutstanding = bills.filter((b) => b.status !== "reconciled").reduce((s, b) => s + Number(b.total_amount), 0);
    const totalReconciled = bills.filter((b) => b.status === "reconciled").reduce((s, b) => s + Number(b.total_amount), 0);
    return { pending, partial, reconciled, disputed, totalOutstanding, totalReconciled };
  }, [bills]);

  const filteredBills = useMemo(() => {
    let list = [...bills];
    if (filterStatus !== "all") list = list.filter((b) => b.status === filterStatus);
    if (filterSupplier !== "all") {
      list = list.filter((b) => {
        const name = b.supplier_name || b.supplier?.supplier_name || "";
        return name === filterSupplier;
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) =>
        (b.bill_reference || "").toLowerCase().includes(q) ||
        (b.supplier_name || b.supplier?.supplier_name || "").toLowerCase().includes(q) ||
        (b.notes || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [bills, filterStatus, filterSupplier, searchQuery]);

  const getSupplierName = (bill: any) => bill.supplier_name || bill.supplier?.supplier_name || "";

  const getItemsForBill = (bill: any): SupplierItem[] => {
    const name = getSupplierName(bill);
    return supplierItemsMap[name] || [];
  };

  const getPaymentsForSupplier = (bill: any) => {
    const name = getSupplierName(bill);
    return payments.filter((p) => p.supplier_name === name);
  };

  return (
    <div className="space-y-5">
      {/* Compact Stats Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-xs text-muted-foreground">Pending</span>
          <span className="text-sm font-bold text-foreground">{stats.pending + stats.partial}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Reconciled</span>
          <span className="text-sm font-bold text-foreground">{stats.reconciled}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">Disputed</span>
          <span className="text-sm font-bold text-foreground">{stats.disputed}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Outstanding</span>
          <span className="text-sm font-bold text-primary">AED {stats.totalOutstanding.toFixed(2)}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs text-muted-foreground">Reconciled</span>
          <span className="text-sm font-bold text-emerald-600">AED {stats.totalReconciled.toFixed(2)}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-card border border-border">
        <Button size="sm" onClick={() => setNewBillOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" /> New Bill
        </Button>
        <div className="h-6 w-px bg-border" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {allSupplierNames.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-7 text-xs"
            placeholder="Search reference, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filteredBills.length} of {bills.length}</span>
      </div>

      {/* Bills Table - Desktop */}
      <div className="hidden md:block border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bill Date</th>
              <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Supplier</th>
              <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Reference</th>
              <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
              <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Items</th>
              <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading...
                </td>
              </tr>
            ) : filteredBills.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-foreground">
                    {bills.length === 0 ? "No bills recorded yet" : "No bills match your filters"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bills.length === 0 ? 'Click "New Bill" when a supplier sends you an invoice.' : "Try adjusting your filters."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredBills.map((bill, idx) => {
                const status = statusConfig[bill.status] || statusConfig.pending;
                const supplierName = getSupplierName(bill);
                const linkedCount = (bill.linked_items || []).length;
                const linkedTotal = (bill.linked_items || []).reduce((s: number, i: any) => s + (i.qty || 0) * (i.unit_cost || 0), 0);
                const billAmount = Number(bill.total_amount);
                const matchPercent = billAmount > 0 && linkedTotal > 0 ? Math.min(100, (linkedTotal / billAmount) * 100) : 0;

                return (
                  <tr
                    key={bill.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors",
                      idx % 2 === 0 ? "" : "bg-muted/10"
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-sm">
                      {format(new Date(bill.bill_date), "dd MMM yyyy")}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {supplierName || <span className="text-muted-foreground italic text-xs">Unknown</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono">{bill.bill_reference || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-sm">
                      {bill.currency} {billAmount.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={cn("gap-1.5", status.badgeClass)}>
                        <span className={cn("h-2 w-2 rounded-full", status.dotColor)} />
                        {bill.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {linkedCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <Progress value={matchPercent} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground">{linkedCount}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailTarget(bill)} title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {bill.status !== "reconciled" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={() => setReconcileTarget(bill)}>
                            Reconcile
                          </Button>
                        )}
                        {bill.status !== "reconciled" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => { if (window.confirm("Delete this bill?")) deleteBill.mutate(bill.id); }}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bills - Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <FileText className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-foreground">{bills.length === 0 ? "No bills recorded yet" : "No bills match your filters"}</p>
            <p className="text-sm text-muted-foreground mt-1">{bills.length === 0 ? 'Click "New Bill" to add one.' : "Try adjusting your filters."}</p>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const status = statusConfig[bill.status] || statusConfig.pending;
            const supplierName = getSupplierName(bill);
            const billAmount = Number(bill.total_amount);
            const linkedCount = (bill.linked_items || []).length;

            return (
              <div key={bill.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{supplierName || "Unknown"}</span>
                  <Badge variant="outline" className={cn("gap-1 text-[10px]", status.badgeClass)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dotColor)} />
                    {bill.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(bill.bill_date), "dd MMM yyyy")}</span>
                  <span className="font-mono">{bill.bill_reference || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-foreground">{bill.currency} {billAmount.toFixed(2)}</span>
                  {linkedCount > 0 && <span className="text-xs text-muted-foreground">{linkedCount} items linked</span>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setDetailTarget(bill)}>
                    <Eye className="h-3 w-3 mr-1" /> Details
                  </Button>
                  {bill.status !== "reconciled" && (
                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => setReconcileTarget(bill)}>
                      Reconcile
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <NewBillDialog
        open={newBillOpen}
        onOpenChange={setNewBillOpen}
        onSubmit={(data) => createBill.mutate(data, { onSuccess: () => setNewBillOpen(false) })}
        isLoading={createBill.isPending}
      />

      {reconcileTarget && (
        <ReconcileDialog
          bill={reconcileTarget}
          open={!!reconcileTarget}
          onOpenChange={(v) => !v && setReconcileTarget(null)}
          supplierItems={getItemsForBill(reconcileTarget)}
          onReconcile={(items, status) => {
            reconcileBill.mutate(
              { billId: reconcileTarget.id, linkedItems: items, status },
              { onSuccess: () => setReconcileTarget(null) }
            );
          }}
        />
      )}

      {detailTarget && (
        <BillDetailDialog
          bill={detailTarget}
          open={!!detailTarget}
          onOpenChange={(v) => !v && setDetailTarget(null)}
          supplierPayments={getPaymentsForSupplier(detailTarget)}
        />
      )}
    </div>
  );
}
