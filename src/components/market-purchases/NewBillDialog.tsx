import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { CreateSupplierBill } from "@/hooks/useSupplierBills";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSupplierBill) => void;
  isLoading?: boolean;
}

export function NewBillDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const { profile } = useUserProfile();
  const [suppliers, setSuppliers] = useState<{ id: string; supplier_name: string }[]>([]);
  const [supplierId, setSupplierId] = useState<string>("none");
  const [billReference, setBillReference] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !profile?.id) return;
    supabase
      .from("suppliers")
      .select("id, supplier_name")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .order("supplier_name")
      .then(({ data }) => setSuppliers(data || []));
  }, [open, profile?.id]);

  const handleSubmit = () => {
    onSubmit({
      supplier_id: supplierId === "none" ? null : supplierId,
      bill_reference: billReference || undefined,
      bill_date: billDate,
      total_amount: parseFloat(totalAmount) || 0,
      currency,
      notes: notes || undefined,
    });
  };

  const reset = () => {
    setSupplierId("none");
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
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No Supplier —</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
