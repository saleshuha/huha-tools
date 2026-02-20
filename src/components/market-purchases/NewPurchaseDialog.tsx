import { useState, useEffect } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { MarketPurchaseItem, CreateMarketPurchase } from "@/hooks/useMarketPurchases";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMarketPurchase) => void;
  isLoading?: boolean;
}

interface ItemRow {
  id: string;
  asin: string;
  sku: string;
  title: string;
  quantity: number;
  unit_cost: number;
  platform: "amazon" | "noon" | "both";
}

const emptyItem = (): ItemRow => ({
  id: Math.random().toString(36).slice(2),
  asin: "",
  sku: "",
  title: "",
  quantity: 1,
  unit_cost: 0,
  platform: "both",
});

export function NewPurchaseDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const { profile } = useUserProfile();
  const [suppliers, setSuppliers] = useState<{ id: string; supplier_name: string }[]>([]);
  const [supplierId, setSupplierId] = useState<string>("none");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [platform, setPlatform] = useState<"amazon" | "noon" | "both" | "po">("both");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

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

  const handleItemChange = (id: string, field: keyof ItemRow, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: field === "quantity" || field === "unit_cost" ? Number(value) : value } : item
      )
    );
  };

  const handleAsinBlur = async (id: string, asin: string) => {
    if (!asin || !profile?.id) return;
    const { data } = await supabase
      .from("asin_inventory")
      .select("title, sku")
      .eq("asin", asin)
      .eq("user_id", profile.id)
      .limit(1)
      .single();
    if (data) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, title: data.title || item.title, sku: data.sku || item.sku } : item
        )
      );
    }
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const totalEstimated = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.quantity > 0 && i.unit_cost >= 0);
    onSubmit({
      supplier_id: supplierId === "none" ? null : supplierId,
      purchase_date: purchaseDate,
      platform,
      notes,
      items: validItems.map(({ id, ...rest }) => rest),
    });
  };

  const reset = () => {
    setSupplierId("none");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPlatform("both");
    setNotes("");
    setItems([emptyItem()]);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Log Market Purchase
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <div className="space-y-1">
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="noon">Noon</SelectItem>
                  <SelectItem value="both">Amazon + Noon</SelectItem>
                  <SelectItem value="po">PO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input placeholder="Optional note" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {/* Items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Items</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">ASIN</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">SKU</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-20">Qty</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Unit Cost</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-20">Platform</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Total</th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-2 py-1">
                        <Input
                          className="h-8 text-xs"
                          placeholder="B0..."
                          value={item.asin}
                          onChange={(e) => handleItemChange(item.id, "asin", e.target.value)}
                          onBlur={(e) => handleAsinBlur(item.id, e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-8 text-xs"
                          placeholder="SKU"
                          value={item.sku}
                          onChange={(e) => handleItemChange(item.id, "sku", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-8 text-xs"
                          placeholder="Product title"
                          value={item.title}
                          onChange={(e) => handleItemChange(item.id, "title", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unit_cost}
                          onChange={(e) => handleItemChange(item.id, "unit_cost", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Select
                          value={item.platform}
                          onValueChange={(v) => handleItemChange(item.id, "platform", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amazon">AMZ</SelectItem>
                            <SelectItem value="noon">Noon</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-1 text-right font-medium text-xs">
                        {(item.quantity * item.unit_cost).toFixed(2)}
                      </td>
                      <td className="px-2 py-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-6 py-3 text-right">
              <p className="text-xs text-muted-foreground">Estimated Total</p>
              <p className="text-xl font-bold text-primary">AED {totalEstimated.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : "Log Purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
