import { useState, useMemo } from "react";
import { Plus, CheckCircle2, AlertTriangle, XCircle, Clock, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useSupplierBills } from "@/hooks/useSupplierBills";
import { useMarketPurchases } from "@/hooks/useMarketPurchases";
import { NewBillDialog } from "./NewBillDialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";

const statusConfig: Record<string, { icon: React.ReactNode; dotColor: string; badgeClass: string }> = {
  pending: { icon: <Clock className="h-3.5 w-3.5" />, dotColor: "bg-amber-500", badgeClass: "bg-amber-500/10 text-amber-700 border-amber-200" },
  partial: { icon: <AlertTriangle className="h-3.5 w-3.5" />, dotColor: "bg-orange-500", badgeClass: "bg-orange-500/10 text-orange-700 border-orange-200" },
  reconciled: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, dotColor: "bg-emerald-500", badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  disputed: { icon: <XCircle className="h-3.5 w-3.5" />, dotColor: "bg-destructive", badgeClass: "bg-destructive/10 text-destructive border-destructive/20" },
};

function ReconcileDialog({
  bill,
  open,
  onOpenChange,
  onReconcile,
}: {
  bill: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReconcile: (purchaseIds: string[], status: "reconciled" | "partial" | "disputed") => void;
}) {
  const { profile } = useUserProfile();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const openPurchasesQuery = useQuery({
    queryKey: ["reconcile_open_purchases", bill?.supplier_id, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      let query = supabase
        .from("market_purchases")
        .select("*, items:market_purchase_items(*)")
        .eq("user_id", profile.id)
        .in("status", ["confirmed", "draft"])
        .order("purchase_date", { ascending: false });

      if (bill?.supplier_id) {
        query = query.eq("supplier_id", bill.supplier_id);
      } else {
        query = query.is("supplier_id", null);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: open && !!bill && !!profile?.id,
  });

  const purchases = openPurchasesQuery.data || [];
  const selectedTotal = purchases
    .filter((p: any) => selectedIds.has(p.id))
    .reduce((sum: number, p: any) => sum + Number(p.total_estimated_cost || 0), 0);

  const variance = selectedTotal - Number(bill?.total_amount || 0);

  const toggleAll = () => {
    if (selectedIds.size === purchases.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(purchases.map((p: any) => p.id)));
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reconcile Bill — {bill?.bill_reference || "Unnamed"}</DialogTitle>
        </DialogHeader>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="bg-card border border-border">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground font-medium">Supplier Bill</p>
              <p className="text-2xl font-bold text-foreground mt-1">{bill?.currency} {Number(bill?.total_amount || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground font-medium">Your Selected</p>
              <p className="text-2xl font-bold text-foreground mt-1">AED {selectedTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className={`border ${Math.abs(variance) < 0.01 ? "border-emerald-200 bg-emerald-500/5" : variance > 0 ? "border-destructive/20 bg-destructive/5" : "border-orange-200 bg-orange-500/5"}`}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground font-medium">Variance</p>
              <p className={`text-2xl font-bold mt-1 ${Math.abs(variance) < 0.01 ? "text-emerald-600" : variance > 0 ? "text-destructive" : "text-orange-600"}`}>
                {variance >= 0 ? "+" : ""}{variance.toFixed(2)}
              </p>
              {Math.abs(variance) > 0.01 && (
                <p className="text-[10px] mt-1 text-muted-foreground">
                  {variance > 0 ? "Supplier charged more" : "Supplier charged less"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Purchase Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Unreconciled Purchases</p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={toggleAll}>
              {selectedIds.size === purchases.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-8" />
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Platform</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Items</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Est. Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPurchasesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No open purchases found for this supplier.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((p: any) => (
                    <TableRow
                      key={p.id}
                      className={`cursor-pointer transition-colors ${selectedIds.has(p.id) ? "bg-primary/5" : "hover:bg-muted/20"}`}
                      onClick={() => toggle(p.id)}
                    >
                      <TableCell>
                        <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.platform.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-sm">{(p.items || []).length} items</TableCell>
                      <TableCell className="font-semibold text-sm">AED {Number(p.total_estimated_cost || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={selectedIds.size === 0}
            onClick={() => onReconcile(Array.from(selectedIds), "disputed")}
          >
            <XCircle className="h-4 w-4 mr-1.5" /> Disputed
          </Button>
          <Button
            variant="outline"
            disabled={selectedIds.size === 0}
            onClick={() => onReconcile(Array.from(selectedIds), "partial")}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Partial
          </Button>
          <Button
            disabled={selectedIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onReconcile(Array.from(selectedIds), "reconciled")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Reconcile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BillReconciliationTab() {
  const { bills, isLoading, createBill, reconcileBill, deleteBill } = useSupplierBills();
  const [newBillOpen, setNewBillOpen] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState<any>(null);

  const pendingCount = useMemo(() => bills.filter((b) => b.status === "pending" || b.status === "partial").length, [bills]);
  const reconciledCount = useMemo(() => bills.filter((b) => b.status === "reconciled").length, [bills]);
  const totalOutstanding = useMemo(() => bills.filter((b) => b.status !== "reconciled").reduce((s, b) => s + Number(b.total_amount), 0), [bills]);

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border border-border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Bills</p>
              <p className="text-lg font-bold text-foreground">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reconciled</p>
              <p className="text-lg font-bold text-foreground">{reconciledCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold text-primary">AED {totalOutstanding.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <Button size="sm" onClick={() => setNewBillOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" /> New Bill
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{bills.length} bills total</span>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border">
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Bill Date</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Supplier</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Reference</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Amount</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Reconciled</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wider font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-foreground">No bills recorded yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "New Bill" when a supplier sends you an invoice.</p>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill, idx) => {
                const status = statusConfig[bill.status] || statusConfig.pending;
                return (
                  <TableRow key={bill.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <TableCell className="font-medium text-sm">
                      {format(new Date(bill.bill_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {bill.supplier?.supplier_name || <span className="text-muted-foreground italic text-xs">Unknown</span>}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-xs">{bill.bill_reference || "—"}</TableCell>
                    <TableCell className="font-semibold text-sm">
                      {bill.currency} {Number(bill.total_amount).toLocaleString("en", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1.5 ${status.badgeClass}`}>
                        <span className={`h-2 w-2 rounded-full ${status.dotColor}`} />
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {bill.reconciled_at ? format(new Date(bill.reconciled_at), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {bill.status !== "reconciled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => setReconcileTarget(bill)}
                          >
                            Reconcile
                          </Button>
                        )}
                        {bill.status !== "reconciled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              if (window.confirm("Delete this bill?")) deleteBill.mutate(bill.id);
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
          onReconcile={(purchaseIds, status) => {
            reconcileBill.mutate(
              { billId: reconcileTarget.id, purchaseIds, status },
              { onSuccess: () => setReconcileTarget(null) }
            );
          }}
        />
      )}
    </div>
  );
}
