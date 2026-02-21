import { useState, useEffect, useMemo } from "react";
import { CalendarDays, Package, ShoppingCart, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
import { GenerateMarketLinkDialog } from "./GenerateMarketLinkDialog";
import { toast } from "sonner";

interface ConsolidatedItem {
  asin: string;
  sku: string;
  title: string;
  amazonQty: number;
  noonQty: number;
  totalQty: number;
  unitCost: number;
}

export function DailyOrdersTab() {
  const { profile } = useUserProfile();
  const { getCostByAsin } = useMarketItemCosts();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ConsolidatedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const fetchDailyOrders = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      // Fetch Amazon DF orders (order_imports) for the date
      const { data: amazonOrders } = await supabase
        .from("order_imports")
        .select("asin, sku, item_title, item_quantity")
        .eq("user_id", profile.id)
        .gte("created_at", `${selectedDate}T00:00:00`)
        .lt("created_at", `${selectedDate}T23:59:59.999`);

      // Fetch Noon B2B orders (noon_processing_orders) for the date
      const { data: noonOrders } = await supabase
        .from("noon_processing_orders")
        .select("sku, title, quantity, partner_sku")
        .eq("user_id", profile.id)
        .gte("created_at", `${selectedDate}T00:00:00`)
        .lt("created_at", `${selectedDate}T23:59:59.999`);

      // Consolidate by ASIN/SKU
      const consolidated: Record<string, ConsolidatedItem> = {};

      (amazonOrders || []).forEach((o: any) => {
        const key = o.asin || o.sku || "unknown";
        if (!consolidated[key]) {
          consolidated[key] = { asin: o.asin || "", sku: o.sku || "", title: o.item_title || "", amazonQty: 0, noonQty: 0, totalQty: 0, unitCost: 0 };
        }
        consolidated[key].amazonQty += Number(o.item_quantity || 1);
      });

      (noonOrders || []).forEach((o: any) => {
        const key = o.partner_sku || o.sku || "unknown";
        if (!consolidated[key]) {
          consolidated[key] = { asin: o.partner_sku || "", sku: o.sku || "", title: o.title || "", amazonQty: 0, noonQty: 0, totalQty: 0, unitCost: 0 };
        }
        consolidated[key].noonQty += Number(o.quantity || 1);
        if (!consolidated[key].title && o.title) consolidated[key].title = o.title;
      });

      // Calculate totals and look up costs
      const result = Object.values(consolidated);
      for (const item of result) {
        item.totalQty = item.amazonQty + item.noonQty;
        const savedCost = await getCostByAsin(item.asin);
        if (savedCost !== null) item.unitCost = savedCost;
      }

      setItems(result);
    } catch (err) {
      toast.error("Failed to fetch daily orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyOrders();
  }, [selectedDate, profile?.id]);

  const amazonTotal = useMemo(() => items.reduce((s, i) => s + i.amazonQty, 0), [items]);
  const noonTotal = useMemo(() => items.reduce((s, i) => s + i.noonQty, 0), [items]);
  const grandTotal = useMemo(() => items.reduce((s, i) => s + i.totalQty * i.unitCost, 0), [items]);

  const handleCostChange = (asin: string, cost: number) => {
    setItems((prev) => prev.map((i) => (i.asin === asin ? { ...i, unitCost: cost } : i)));
  };

  return (
    <div className="space-y-4">
      {/* Date picker + summary */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
        </div>

        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Amazon: {amazonTotal} items</span>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Noon: {noonTotal} items</span>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)} disabled={items.length === 0}>
          <Link2 className="h-4 w-4 mr-1" /> Generate Purchase Link
        </Button>
      </div>

      {/* Consolidated table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No orders found for {selectedDate}</div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">ASIN</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">SKU</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">AMZ Qty</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Noon Qty</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Cost</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.asin} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">{item.asin}</td>
                  <td className="px-3 py-2 text-xs">{item.sku}</td>
                  <td className="px-3 py-2 text-xs max-w-[200px] truncate">{item.title}</td>
                  <td className="px-3 py-2 text-center">
                    {item.amazonQty > 0 && <Badge variant="outline" className="text-orange-600">{item.amazonQty}</Badge>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {item.noonQty > 0 && <Badge variant="outline" className="text-yellow-600">{item.noonQty}</Badge>}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold">{item.totalQty}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-7 w-20 text-xs ml-auto"
                      value={item.unitCost}
                      onChange={(e) => handleCostChange(item.asin, Number(e.target.value))}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{(item.totalQty * item.unitCost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 border-t font-semibold">
                <td colSpan={5} className="px-3 py-2 text-right">Total:</td>
                <td className="px-3 py-2 text-center">{items.reduce((s, i) => s + i.totalQty, 0)}</td>
                <td />
                <td className="px-3 py-2 text-right text-primary">AED {grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <GenerateMarketLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        items={items.map((i) => ({ asin: i.asin, sku: i.sku, title: i.title, qty: i.totalQty, unit_cost: i.unitCost }))}
      />
    </div>
  );
}
