import { useState } from "react";
import { Plus, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useSupplierBills } from "@/hooks/useSupplierBills";
import { useMarketPurchases } from "@/hooks/useMarketPurchases";
import { NewBillDialog } from "./NewBillDialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";

const statusIcons: Record<string, React.ReactNode> = {
  pending: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  partial: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  reconciled: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  disputed: <XCircle className="h-4 w-4 text-red-500" />,
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  partial: "bg-orange-100 text-orange-800 border-orange-200",
  reconciled: "bg-green-100 text-green-800 border-green-200",
  disputed: "bg-red-100 text-red-800 border-red-200",
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
    if (selectedIds.size === purchases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(purchases.map((p: any) => p.id)));
    }
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

        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Supplier Bill Amount</p>
              <p className="text-xl font-bold">{bill?.currency} {Number(bill?.total_amount || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Your Selected Total</p>
              <p className="text-xl font-bold">AED {selectedTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className={`${Math.abs(variance) < 0.01 ? "bg-green-50 border-green-200" : variance > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Variance</p>
              <p className={`text-xl font-bold ${Math.abs(variance) < 0.01 ? "text-green-600" : variance > 0 ? "text-red-600" : "text-amber-600"}`}>
                {variance >= 0 ? "+" : ""}{variance.toFixed(2)}
              </p>
              {Math.abs(variance) > 0.01 && (
                <p className="text-xs mt-1">
                  {variance > 0 ? "Supplier charged MORE than your records" : "Supplier charged LESS than your records"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Unreconciled Purchases from this Supplier</p>
            <Button size="sm" variant="outline" onClick={toggleAll}>
              {selectedIds.size === purchases.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8" />
                <TableHead>Date</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Est. Total</TableHead>
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
                  <TableRow key={p.id} className={selectedIds.has(p.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.platform.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{(p.items || []).length} items</TableCell>
                    <TableCell className="font-semibold">AED {Number(p.total_estimated_cost || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={selectedIds.size === 0}
            onClick={() => onReconcile(Array.from(selectedIds), "disputed")}
          >
            Mark as Disputed
          </Button>
          <Button
            variant="outline"
            disabled={selectedIds.size === 0}
            onClick={() => onReconcile(Array.from(selectedIds), "partial")}
          >
            Partial Reconcile
          </Button>
          <Button
            disabled={selectedIds.size === 0}
            onClick={() => onReconcile(Array.from(selectedIds), "reconciled")}
          >
            Reconcile ✓
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={() => setNewBillOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Bill
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{bills.length} bills total</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Bill Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reconciled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No bills recorded yet. Click "New Bill" when a supplier sends you an invoice.
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium text-sm">
                    {format(new Date(bill.bill_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {bill.supplier?.supplier_name || <span className="text-muted-foreground italic">Unknown</span>}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{bill.bill_reference || "—"}</TableCell>
                  <TableCell className="font-semibold text-sm">
                    {bill.currency} {Number(bill.total_amount).toLocaleString("en", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`flex items-center gap-1 w-fit ${statusColors[bill.status]}`}>
                      {statusIcons[bill.status]}
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
                          onClick={() => setReconcileTarget(bill)}
                        >
                          Reconcile
                        </Button>
                      )}
                      {bill.status !== "reconciled" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteBill.mutate(bill.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
