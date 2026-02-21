import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCostDialog({ open, onOpenChange }: Props) {
  const { upsertCost } = useMarketItemCosts();
  const [asin, setAsin] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierName, setSupplierName] = useState("");

  const handleSubmit = () => {
    if (!asin || !unitCost) return;
    upsertCost.mutate(
      { asin, sku: sku || undefined, title: title || undefined, unit_cost: Number(unitCost), supplier_name: supplierName || undefined },
      { onSuccess: () => { onOpenChange(false); reset(); } }
    );
  };

  const reset = () => { setAsin(""); setSku(""); setTitle(""); setUnitCost(""); setSupplierName(""); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Item Cost</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>ASIN *</Label>
            <Input placeholder="B0..." value={asin} onChange={(e) => setAsin(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>SKU</Label>
              <Input placeholder="Optional" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Unit Cost (AED) *</Label>
              <Input type="number" min={0} step={0.01} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input placeholder="Product title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Supplier Name</Label>
            <Input placeholder="Optional" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!asin || !unitCost || upsertCost.isPending}>
            {upsertCost.isPending ? "Saving..." : "Save Cost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
