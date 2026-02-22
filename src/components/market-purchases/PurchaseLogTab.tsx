import { useState, useMemo } from "react";
import { RefreshCw, Filter, Package, X, Copy, ExternalLink, Search, Link2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useMarketPurchaseLinks, type MarketLinkItem } from "@/hooks/useMarketPurchaseLinks";
import { toast } from "sonner";

interface LinkItem extends MarketLinkItem {
  supplier_name?: string;
}

interface LogEntry {
  asin: string;
  sku: string;
  title: string;
  qty: number;
  unit_cost: number;
  supplier_name: string;
  link_title: string;
  link_token: string;
  link_created_at: string;
  platform: string;
  noon_image_key?: string;
}

function getImgUrl(asin: string, size: "sm" | "lg" = "sm") {
  return size === "sm"
    ? `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX44_.jpg`
    : `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX300_.jpg`;
}

export function PurchaseLogTab() {
  const { links, isLoading, refetch } = useMarketPurchaseLinks();
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Flatten all assigned items into a chronological log
  const { logEntries, suppliers, stats } = useMemo(() => {
    const entries: LogEntry[] = [];
    const supplierSet = new Set<string>();

    links.forEach((link) => {
      const items = (link.items || []) as LinkItem[];
      items.forEach((item) => {
        if (!item.supplier_name) return;
        supplierSet.add(item.supplier_name);
        entries.push({
          asin: item.asin,
          sku: item.sku,
          title: item.title,
          qty: item.qty,
          unit_cost: item.unit_cost,
          supplier_name: item.supplier_name,
          link_title: link.title || "Untitled",
          link_token: link.link_token,
          link_created_at: link.created_at,
          platform: link.platform,
          noon_image_key: item.noon_image_key,
        });
      });
    });

    // Sort newest first
    entries.sort((a, b) => new Date(b.link_created_at).getTime() - new Date(a.link_created_at).getTime());

    const totalCost = entries.reduce((s, e) => s + (e.unit_cost || 0) * (e.qty || 0), 0);
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);

    return {
      logEntries: entries,
      suppliers: Array.from(supplierSet).sort(),
      stats: { count: entries.length, totalCost, totalQty, suppliers: supplierSet.size },
    };
  }, [links]);

  // Filter
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Assigned Items", value: stats.count, icon: Package },
          { label: "Total Qty", value: stats.totalQty, icon: Package },
          { label: "Suppliers", value: stats.suppliers, icon: Users },
          { label: "Total Cost", value: `AED ${stats.totalCost.toFixed(0)}`, icon: Package },
        ].map((card) => (
          <div key={card.label} className="p-3 rounded-xl bg-card border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{card.label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder="Search ASIN, SKU, title, supplier..."
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
            <p className="text-sm text-muted-foreground mt-1">Items will appear here once suppliers are assigned via purchase links.</p>
          </div>
        ) : (
          filtered.map((entry, idx) => (
            <div
              key={`${entry.asin}-${entry.link_token}-${idx}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors"
            >
              {/* Image */}
              <div
                className="h-11 w-11 rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0 bg-muted/30"
                onClick={() =>
                  setPreviewImage({ url: getImgUrl(entry.asin, "lg"), title: entry.title || entry.asin })
                }
              >
                <img
                  src={getImgUrl(entry.asin, "sm")}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{entry.title || "Untitled"}</p>
                <div className="flex items-center gap-2 mt-0.5 min-w-0 overflow-hidden">
                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[110px]">{entry.asin}</span>
                  {entry.sku && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">· {entry.sku}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-medium">
                    {entry.supplier_name}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {entry.link_title}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(entry.link_created_at), "dd MMM")}
                  </span>
                </div>
              </div>

              {/* Cost */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold">{entry.qty} × AED {(entry.unit_cost || 0).toFixed(2)}</p>
                {entry.unit_cost > 0 && (
                  <p className="text-[10px] text-primary font-bold">AED {(entry.qty * entry.unit_cost).toFixed(2)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyLink(entry.link_token)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`/market-purchase/${entry.link_token}`, "_blank")}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
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
