import { useState, useEffect, useMemo } from "react";
import { CalendarDays, Package, Link2, ChevronLeft, ChevronRight, RotateCcw, ShoppingBag, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
import { GenerateMarketLinkDialog } from "./GenerateMarketLinkDialog";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";

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
      const { data: amazonOrders } = await supabase
        .from("order_imports")
        .select("asin, sku, item_title, item_quantity")
        .eq("user_id", profile.id)
        .gte("created_at", `${selectedDate}T00:00:00`)
        .lt("created_at", `${selectedDate}T23:59:59.999`);

      const { data: noonOrders } = await supabase
        .from("noon_processing_orders")
        .select("sku, title, quantity, partner_sku")
        .eq("user_id", profile.id)
        .gte("created_at", `${selectedDate}T00:00:00`)
        .lt("created_at", `${selectedDate}T23:59:59.999`);

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
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const handleCostChange = (asin: string, cost: number) => {
    setItems((prev) => prev.map((i) => (i.asin === asin ? { ...i, unitCost: cost } : i)));
  };

  const goToDate = (dir: "prev" | "next" | "today") => {
    if (dir === "today") setSelectedDate(new Date().toISOString().split("T")[0]);
    else {
      const d = dir === "prev" ? subDays(new Date(selectedDate), 1) : addDays(new Date(selectedDate), 1);
      setSelectedDate(d.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Date Navigation Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToDate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40 h-8 text-sm" />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToDate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {!isToday && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => goToDate("today")}>
            <RotateCcw className="h-3 w-3 mr-1" /> Today
          </Button>
        )}

        <div className="flex-1" />

        <Button
          size="sm"
          className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          onClick={() => setLinkDialogOpen(true)}
          disabled={items.length === 0}
        >
          <Link2 className="h-3.5 w-3.5 mr-1.5" /> Generate Purchase Link
        </Button>
      </div>

      {/* Platform Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-orange-500 bg-card hover:shadow-md transition-shadow">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-orange-500/10">
              <Package className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Amazon Orders</p>
              <p className="text-xl font-bold text-foreground">{amazonTotal} <span className="text-sm font-normal text-muted-foreground">items</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 bg-card hover:shadow-md transition-shadow">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-yellow-500/10">
              <ShoppingBag className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Noon Orders</p>
              <p className="text-xl font-bold text-foreground">{noonTotal} <span className="text-sm font-normal text-muted-foreground">items</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary bg-card hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <CardContent className="py-4 px-5 flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Estimated Total</p>
              <p className="text-xl font-bold text-primary">AED {grandTotal.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consolidated Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="text-center space-y-2">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading orders...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-foreground">No orders for this date</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Upload Amazon DF or Noon B2B order files to see consolidated daily orders here.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">ASIN</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">SKU</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">AMZ</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Noon</th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Unit Cost</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.asin} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{item.asin}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.sku}</td>
                  <td className="px-4 py-2.5 text-xs max-w-[200px] truncate text-foreground">{item.title}</td>
                  <td className="px-4 py-2.5 text-center">
                    {item.amazonQty > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        {item.amazonQty}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {item.noonQty > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        {item.noonQty}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold text-foreground">{item.totalQty}</td>
                  <td className="px-4 py-2.5">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-7 w-20 text-xs ml-auto block"
                      value={item.unitCost}
                      onChange={(e) => handleCostChange(item.asin, Number(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-foreground">{(item.totalQty * item.unitCost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td colSpan={5} className="px-4 py-3 text-right font-semibold text-sm text-muted-foreground">Grand Total:</td>
                <td className="px-4 py-3 text-center font-bold text-foreground">{items.reduce((s, i) => s + i.totalQty, 0)}</td>
                <td />
                <td className="px-4 py-3 text-right font-bold text-lg text-primary">AED {grandTotal.toFixed(2)}</td>
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
