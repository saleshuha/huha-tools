import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, RefreshCw, ArrowUpDown, Search } from "lucide-react";

interface InventoryCompare {
  sku: string;
  title: string;
  local_qty: number;
  shopify_qty: number | null;
  matched: boolean;
  selected: boolean;
}

export function ShopifyInventorySync() {
  const [items, setItems] = useState<InventoryCompare[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch local inventory (active items with SKU)
      const { data: inventory } = await supabase
        .from("asin_inventory")
        .select("sku, title, quantity")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .not("sku", "is", null);

      // Group by SKU and sum quantities
      const localMap = new Map<string, { title: string; qty: number }>();
      for (const item of inventory || []) {
        if (!item.sku) continue;
        const existing = localMap.get(item.sku);
        if (existing) {
          existing.qty += item.quantity || 0;
        } else {
          localMap.set(item.sku, { title: item.title || "", qty: item.quantity || 0 });
        }
      }

      // Fetch Shopify products
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/shopify-sync?action=fetch-products`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await res.json();

      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      // Build Shopify SKU map
      const shopifyMap = new Map<string, number>();
      for (const v of result.products || []) {
        if (v.sku) {
          shopifyMap.set(v.sku, v.inventory_quantity ?? 0);
        }
      }

      // Build comparison
      const compared: InventoryCompare[] = [];
      for (const [sku, local] of localMap) {
        const shopifyQty = shopifyMap.get(sku);
        compared.push({
          sku,
          title: local.title,
          local_qty: local.qty,
          shopify_qty: shopifyQty ?? null,
          matched: shopifyQty !== undefined,
          selected: false,
        });
      }

      // Sort: mismatched first, then matched
      compared.sort((a, b) => {
        if (a.matched && !b.matched) return 1;
        if (!a.matched && b.matched) return -1;
        if (a.local_qty !== a.shopify_qty && b.local_qty === b.shopify_qty) return -1;
        if (a.local_qty === a.shopify_qty && b.local_qty !== b.shopify_qty) return 1;
        return a.sku.localeCompare(b.sku);
      });

      setItems(compared);
      toast.success(`Loaded ${compared.length} SKUs (${compared.filter((i) => i.matched).length} matched in Shopify)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (sku: string) => {
    setItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, selected: !i.selected } : i))
    );
  };

  const toggleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setItems((prev) =>
      prev.map((i) => (i.matched ? { ...i, selected: newVal } : i))
    );
  };

  const syncSelected = async () => {
    const toSync = items.filter(
      (i) => i.selected && i.matched && i.local_qty !== i.shopify_qty
    );
    if (toSync.length === 0) {
      toast.info("No items with quantity differences selected");
      return;
    }

    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/shopify-sync?action=sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: toSync.map((i) => ({
              sku: i.sku,
              title: i.title,
              local_quantity: i.local_qty,
            })),
          }),
        }
      );
      const result = await res.json();

      if (result.error) {
        toast.error(result.error);
      } else {
        const successes = (result.results || []).filter(
          (r: any) => r.status === "success"
        ).length;
        const failures = (result.results || []).filter(
          (r: any) => r.status === "failed"
        ).length;
        toast.success(`Synced ${successes} items${failures > 0 ? `, ${failures} failed` : ""}`);
        // Refresh
        loadComparison();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.title.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCount = items.filter((i) => i.selected).length;
  const mismatchCount = items.filter(
    (i) => i.matched && i.local_qty !== i.shopify_qty
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Inventory Comparison
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={loadComparison} disabled={loading} variant="outline">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Load & Compare
              </Button>
              <Button
                onClick={syncSelected}
                disabled={syncing || selectedCount === 0}
              >
                {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sync Selected ({selectedCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length > 0 && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search SKU or title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{items.length} total</Badge>
                  <Badge variant="secondary">{items.filter((i) => i.matched).length} matched</Badge>
                  {mismatchCount > 0 && (
                    <Badge variant="destructive">{mismatchCount} need sync</Badge>
                  )}
                </div>
              </div>

              <div className="rounded-md border max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Local Qty</TableHead>
                      <TableHead className="text-right">Shopify Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            disabled={!item.matched}
                            onCheckedChange={() => toggleSelect(item.sku)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.local_qty}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.shopify_qty !== null ? item.shopify_qty : "—"}
                        </TableCell>
                        <TableCell>
                          {!item.matched ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Not in Shopify
                            </Badge>
                          ) : item.local_qty === item.shopify_qty ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              In Sync
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Out of Sync</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {items.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Click "Load & Compare" to compare your local inventory with Shopify</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
