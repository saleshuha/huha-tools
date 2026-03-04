import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Package, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";

interface UnmatchedItem {
  asin: string;
  sku: string;
  title: string;
  quantity: number;
  image_url: string | null;
}

export function ShopifyPushInventory() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<UnmatchedItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState({ done: 0, total: 0, created: 0, failed: 0 });
  const [fetched, setFetched] = useState(false);

  const callEdge = async (action: string, body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(
      `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/shopify-sync?action=${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const fetchUnmatched = async () => {
    setLoading(true);
    try {
      const data = await callEdge("fetch-unmatched-inventory", {});
      setItems(data.items || []);
      setSelected(new Set());
      setFetched(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.sku)));
    }
  };

  const toggleItem = (sku: string) => {
    const next = new Set(selected);
    if (next.has(sku)) next.delete(sku);
    else next.add(sku);
    setSelected(next);
  };

  const handlePush = async () => {
    if (selected.size === 0) return;
    setPushing(true);
    const allSkus = [...selected];
    const batchSize = 5;
    let totalCreated = 0;
    let totalFailed = 0;
    setPushProgress({ done: 0, total: allSkus.length, created: 0, failed: 0 });

    try {
      for (let i = 0; i < allSkus.length; i += batchSize) {
        const batch = allSkus.slice(i, i + batchSize);
        try {
          const data = await callEdge("bulk-create-from-inventory", { skus: batch });
          totalCreated += data.created || 0;
          totalFailed += data.failed || 0;
        } catch {
          totalFailed += batch.length;
        }
        setPushProgress({
          done: Math.min(i + batchSize, allSkus.length),
          total: allSkus.length,
          created: totalCreated,
          failed: totalFailed,
        });
      }
      toast({
        title: "Push complete",
        description: `Created: ${totalCreated}, Failed: ${totalFailed} out of ${allSkus.length}`,
      });
      fetchUnmatched();
    } catch (e: any) {
      toast({ title: "Push failed", description: e.message, variant: "destructive" });
    } finally {
      setPushing(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <Upload className="h-5 w-5" /> Push Inventory to Shopify
                {fetched && items.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">({items.length} unmatched)</span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardHeader className="pt-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Create Shopify products from local inventory items that don't exist in your store yet.
              </p>
              <Button variant="outline" size="sm" onClick={fetchUnmatched} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                {fetched ? "Refresh" : "Load Unmatched Items"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !fetched ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Click "Load Unmatched Items" to find inventory items not yet in Shopify.</p>
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">All inventory items are already in Shopify!</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {items.length} unmatched items found · {selected.size} selected
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                      {selected.size === items.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button size="sm" onClick={handlePush} disabled={pushing || selected.size === 0}>
                      {pushing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                      Push {selected.size} to Shopify
                    </Button>
                  </div>
                </div>

                {pushing && (
                  <div className="space-y-1">
                    <Progress value={pushProgress.total > 0 ? (pushProgress.done / pushProgress.total) * 100 : 0} className="h-2" />
                    <p className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>Processing {pushProgress.done}/{pushProgress.total}</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {pushProgress.created}</span>
                      {pushProgress.failed > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> {pushProgress.failed}</span>}
                    </p>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-3 w-10">
                          <Checkbox
                            checked={selected.size === items.length && items.length > 0}
                            onCheckedChange={toggleAll}
                          />
                        </th>
                        <th className="text-left p-3 font-medium w-16">Image</th>
                        <th className="text-left p-3 font-medium">Title</th>
                        <th className="text-left p-3 font-medium">SKU</th>
                        <th className="text-left p-3 font-medium">ASIN</th>
                        <th className="text-right p-3 font-medium">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.sku}
                          className={`border-t hover:bg-muted/30 cursor-pointer ${selected.has(item.sku) ? "bg-primary/5" : ""}`}
                          onClick={() => toggleItem(item.sku)}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={selected.has(item.sku)}
                              onCheckedChange={() => toggleItem(item.sku)}
                            />
                          </td>
                          <td className="p-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                          <td className="p-3 max-w-[250px] truncate font-medium">{item.title}</td>
                          <td className="p-3 font-mono text-xs">{item.sku}</td>
                          <td className="p-3 font-mono text-xs">{item.asin}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
