import { useState, useEffect, useMemo } from "react";
import { FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMarketPurchaseLinks } from "@/hooks/useMarketPurchaseLinks";
import { useMarketCreditPayments } from "@/hooks/useMarketCreditPayments";
import type { CreateSupplierBill } from "@/hooks/useSupplierBills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSupplierBill) => void;
  isLoading?: boolean;
}

export function NewBillDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const { links } = useMarketPurchaseLinks();
  const { payments } = useMarketCreditPayments();

  const [supplierName, setSupplierName] = useState<string>("none");
  const [billReference, setBillReference] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [notes, setNotes] = useState("");

  // Build supplier list from purchase links JSONB items
  const supplierBalances = useMemo(() => {
    const grouped: Record<string, { total: number; paid: number }> = {};
    (links || []).forEach((link) => {
      const items = Array.isArray(link.items) ? link.items : [];
      items.forEach((item: any) => {
        const name = item.supplier_name;
        if (!name) return;
        if (!grouped[name]) grouped[name] = { total: 0, paid: 0 };
        grouped[name].total += (item.qty || 0) * (item.unit_cost || 0);
      });
    });
    (payments || []).forEach((p) => {
      if (grouped[p.supplier_name]) {
        grouped[p.supplier_name].paid += Number(p.amount);
      }
    });
    return Object.entries(grouped)
      .map(([name, data]) => ({
        name,
        outstanding: Math.max(0, data.total - data.paid),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [links, payments]);

  const selectedBalance = supplierBalances.find((s) => s.name === supplierName);

  const handleImportFromCredit = () => {
    if (selectedBalance && selectedBalance.outstanding > 0) {
      setTotalAmount(selectedBalance.outstanding.toFixed(2));
    }
  };

  const handleSubmit = () => {
    onSubmit({
      supplier_id: null,
      supplier_name: supplierName === "none" ? null : supplierName,
      bill_reference: billReference || undefined,
      bill_date: billDate,
      total_amount: parseFloat(totalAmount) || 0,
      currency,
      notes: notes || undefined,
    });
  };

  const reset = () => {
    setSupplierName("none");
    setBillReference("");
    setBillDate(new Date().toISOString().split("T")[0]);
    setTotalAmount("");
    setCurrency("AED");
    setNotes("");
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Record Supplier Bill
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Supplier</Label>
            <Select value={supplierName} onValueChange={setSupplierName}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No Supplier —</SelectItem>
                {supplierBalances.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name} {s.outstanding > 0 ? `(AED ${s.outstanding.toFixed(2)} outstanding)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBalance && selectedBalance.outstanding > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
              onClick={handleImportFromCredit}
            >
              <Download className="h-3 w-3 mr-1.5" />
              Import from Credit — AED {selectedBalance.outstanding.toFixed(2)}
            </Button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bill Reference #</Label>
              <Input placeholder="e.g. INV-2024-001" value={billReference} onChange={(e) => setBillReference(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Bill Date</Label>
              <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Total Amount</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea placeholder="Any additional notes about this bill..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !totalAmount}>
            {isLoading ? "Creating..." : "Create Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
