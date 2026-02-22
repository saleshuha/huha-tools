import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Filter, Package, X, Copy, ExternalLink, Search, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  asin: string | null;
  sku: string | null;
  title: string | null;
  qty: number;
  unit_cost: number;
  supplier_name: string | null;
  link_id: string;
  link_title: string;
  link_token: string;
  link_created_at: string;
  platform: string | null;
}

function getImgUrl(asin: string, size: "sm" | "lg" = "sm") {
  return size === "sm"
    ? `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX44_.jpg`
    : `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX300_.jpg`;
}

export function PurchaseLogTab() {
  const { profile } = useUserProfile();
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const { data: logEntries = [], isLoading, refetch } = useQuery({
    queryKey: ["market_purchase_log", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("market_purchase_links")
        .select("id, title, link_token, items, platform, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const entries: LogEntry[] = [];
      (data || []).forEach((link: any) => {
        const items = Array.isArray(link.items) ? link.items : [];
        items.forEach((item: any) => {
          if (!item.supplier_name) return;
          entries.push({
            id: `${link.id}-${item.asin || item.sku}`,
            asin: item.asin || null,
            sku: item.sku || null,
            title: item.title || null,
            qty: item.qty || 0,
            unit_cost: item.unit_cost || 0,
            supplier_name: item.supplier_name || null,
            link_id: link.id,
            link_title: link.title || "Untitled",
            link_token: link.link_token,
            link_created_at: link.created_at,
            platform: link.platform,
          });
        });
      });
      return entries;
    },
    enabled: !!profile?.id,
  });

  const { suppliers, stats } = useMemo(() => {
    const supplierSet = new Set<string>();
    let totalQty = 0;
    let totalCost = 0;

    logEntries.forEach((e) => {
      if (e.supplier_name) supplierSet.add(e.supplier_name);
      totalQty += e.qty || 0;
      totalCost += e.unit_cost * (e.qty || 0);
    });

    return {
      suppliers: Array.from(supplierSet).sort(),
      stats: { count: logEntries.length, totalQty, totalCost, suppliers: supplierSet.size },
    };
  }, [logEntries]);

  const filtered = logEntries.filter((entry) => {
    if (filterSupplier !== "all" && entry.supplier_name !== filterSupplier) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      entry.asin?.toLowerCase().includes(q) ||
      entry.sku?.toLowerCase().includes(q) ||
      entry.title?.toLowerCase().includes(q) ||
      entry.supplier_name?.toLowerCase().includes(q) ||
      entry.link_title?.toLowerCase().includes(q)
    );
  });

  const hasActiveFilters = search || filterSupplier !== "all";

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/market-purchase/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="space-y-4">
      {/* Compact Stat Bar */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border overflow-x-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 flex-shrink-0">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Items</span>
          <span className="text-sm font-bold text-foreground">{stats.count}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 flex-shrink-0">
          <span className="text-xs text-muted-foreground">Qty</span>
          <span className="text-sm font-bold text-foreground">{stats.totalQty}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 flex-shrink-0">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Suppliers</span>
          <span className="text-sm font-bold text-foreground">{stats.suppliers || "—"}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 flex-shrink-0">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-bold text-primary">{stats.totalCost > 0 ? `AED ${stats.totalCost.toFixed(2)}` : "—"}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder="Search ASIN, SKU, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterSupplier("all"); }}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Log Entries */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Package className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-foreground">No assigned items yet</p>
            <p className="text-sm text-muted-foreground mt-1">Items will appear here once suppliers are assigned via daily orders purchase links.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block border border-border rounded-xl overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[52px]"></th>
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Product</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Supplier</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Cost</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-2 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, idx) => (
                    <tr key={entry.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                      <td className="px-3 py-2">
                        {entry.asin && (
                          <div
                            className="h-10 w-10 rounded-md border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all bg-muted/30"
                            onClick={() => setPreviewImage({ url: getImgUrl(entry.asin!, "lg"), title: entry.title || entry.asin! })}
                          >
                            <img src={getImgUrl(entry.asin, "sm")} alt="" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{entry.title || "Untitled"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {entry.asin && <span className="font-mono text-[10px] text-muted-foreground">{entry.asin}</span>}
                          {entry.sku && <span className="text-[10px] text-muted-foreground">· {entry.sku}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] font-medium">{entry.supplier_name || "—"}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">{entry.qty}</td>
                      <td className="px-3 py-2 text-right text-xs">{entry.unit_cost > 0 ? `AED ${entry.unit_cost.toFixed(2)}` : "—"}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-primary">
                        {entry.unit_cost > 0 ? `AED ${(entry.unit_cost * entry.qty).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.link_created_at), "dd MMM yyyy")}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyLink(entry.link_token)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`/market-purchase/${entry.link_token}`, "_blank")}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                const { data: link } = await supabase
                                  .from("market_purchase_links")
                                  .select("items")
                                  .eq("id", entry.link_id)
                                  .single();
                                if (link) {
                                  const updatedItems = (link.items as any[]).map((item: any) =>
                                    (item.asin === entry.asin && item.sku === entry.sku)
                                      ? { ...item, supplier_name: undefined }
                                      : item
                                  );
                                  await supabase
                                    .from("market_purchase_links")
                                    .update({ items: updatedItems as any })
                                    .eq("id", entry.link_id);
                                }
                                refetch();
                                toast.success("Entry removed");
                              } catch {
                                toast.error("Failed to remove");
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {stats.totalCost > 0 && (
                  <tfoot>
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td colSpan={5} className="px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground">Grand Total:</td>
                      <td className="px-3 py-2.5 text-right font-bold text-primary">AED {stats.totalCost.toFixed(2)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                  {entry.asin && (
                    <div
                      className="h-11 w-11 rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0 bg-muted/30"
                      onClick={() => setPreviewImage({ url: getImgUrl(entry.asin!, "lg"), title: entry.title || entry.asin! })}
                    >
                      <img src={getImgUrl(entry.asin, "sm")} alt="" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{entry.title || "Untitled"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.supplier_name && <Badge variant="outline" className="text-[9px] h-4 px-1.5">{entry.supplier_name}</Badge>}
                      <span className="text-[10px] text-muted-foreground">{format(new Date(entry.link_created_at), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold">Qty: {entry.qty}</p>
                    {entry.unit_cost > 0 && <p className="text-[10px] text-primary font-bold">AED {(entry.unit_cost * entry.qty).toFixed(2)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Image Preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-md p-2">
          {previewImage && (
            <div className="flex flex-col items-center gap-2">
              <img src={previewImage.url} alt={previewImage.title} className="max-h-[60vh] object-contain rounded-lg" />
              <p className="text-xs text-muted-foreground text-center truncate max-w-full px-2">{previewImage.title}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
