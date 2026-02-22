import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LookupResult {
  sku: string | null;
  title: string | null;
  supplier_name: string | null;
  source_table: string;
}

async function lookupAsinDetails(asin: string): Promise<LookupResult | null> {
  // Try orders table first
  const { data: order } = await supabase
    .from("orders")
    .select("sku, item_title")
    .eq("asin", asin)
    .limit(1)
    .maybeSingle();

  if (order) {
    return { sku: order.sku, title: order.item_title, supplier_name: null, source_table: "orders" };
  }

  // Try noon_orders
  const { data: noonOrder } = await supabase
    .from("noon_orders")
    .select("sku, title, partner_sku")
    .eq("sku", asin)
    .limit(1)
    .maybeSingle();

  if (noonOrder) {
    return { sku: noonOrder.partner_sku || noonOrder.sku, title: noonOrder.title, supplier_name: null, source_table: "noon_orders" };
  }

  // Try noon_orders by partner_sku
  const { data: noonByPartner } = await supabase
    .from("noon_orders")
    .select("sku, title, partner_sku")
    .eq("partner_sku", asin)
    .limit(1)
    .maybeSingle();

  if (noonByPartner) {
    return { sku: noonByPartner.partner_sku || noonByPartner.sku, title: noonByPartner.title, supplier_name: null, source_table: "noon_orders" };
  }

  // Try asin_inventory
  const { data: inv } = await supabase
    .from("asin_inventory")
    .select("sku, title")
    .eq("asin", asin)
    .limit(1)
    .maybeSingle();

  if (inv) {
    return { sku: inv.sku, title: inv.title, supplier_name: null, source_table: "inventory" };
  }

  // Try order_imports
  const { data: oi } = await supabase
    .from("order_imports")
    .select("sku, item_title, asin")
    .eq("asin", asin)
    .limit(1)
    .maybeSingle();

  if (oi) {
    return { sku: oi.sku, title: oi.item_title, supplier_name: null, source_table: "order_imports" };
  }

  return null;
}

export function AddCostDialog({ open, onOpenChange }: Props) {
  const { upsertCost } = useMarketItemCosts();
  const [asin, setAsin] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found">("idle");

  // Auto-lookup when ASIN changes
  useEffect(() => {
    const trimmed = asin.trim();
    if (trimmed.length < 5) {
      setLookup(null);
      setLookupState("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setLookupState("loading");
      const result = await lookupAsinDetails(trimmed);
      if (result) {
        setLookup(result);
        setLookupState("found");
      } else {
        setLookup(null);
        setLookupState("not_found");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [asin]);

  const handleSubmit = () => {
    if (!asin.trim() || !unitCost) return;
    upsertCost.mutate(
      {
        asin: asin.trim(),
        sku: lookup?.sku || undefined,
        title: lookup?.title || undefined,
        unit_cost: Number(unitCost),
        supplier_name: lookup?.supplier_name || undefined,
        source: "manual",
      },
      { onSuccess: () => { onOpenChange(false); reset(); } }
    );
  };

  const reset = () => {
    setAsin("");
    setUnitCost("");
    setLookup(null);
    setLookupState("idle");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Item Cost</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>ASIN *</Label>
            <Input placeholder="B0..." value={asin} onChange={(e) => setAsin(e.target.value)} />
            {lookupState === "loading" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Looking up details...
              </div>
            )}
            {lookupState === "not_found" && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
                <AlertCircle className="h-3 w-3" /> No matching product found in orders
              </div>
            )}
          </div>

          {lookupState === "found" && lookup && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Found in {lookup.source_table}
              </div>
              {lookup.title && (
                <p className="text-xs text-foreground truncate">{lookup.title}</p>
              )}
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                {lookup.sku && <span>SKU: <span className="font-mono">{lookup.sku}</span></span>}
                {lookup.supplier_name && <span>Supplier: {lookup.supplier_name}</span>}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Unit Cost (AED) *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!asin.trim() || !unitCost || upsertCost.isPending}>
            {upsertCost.isPending ? "Saving..." : "Save Cost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
