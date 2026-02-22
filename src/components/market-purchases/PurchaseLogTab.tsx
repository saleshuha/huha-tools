import { useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Filter, Package, X, Copy, Link2, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useMarketPurchaseLinks, type MarketPurchaseLink, type MarketLinkItem } from "@/hooks/useMarketPurchaseLinks";
import { toast } from "sonner";

const platformDotColors: Record<string, string> = {
  amazon: "bg-orange-500",
  noon: "bg-yellow-500",
  both: "bg-sky-500",
};

interface LinkItem extends MarketLinkItem {
  supplier_name?: string;
}

function groupBySupplier(items: LinkItem[]) {
  const groups: Record<string, LinkItem[]> = {};
  items.forEach((item) => {
    const key = item.supplier_name || "Unassigned";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

function getImgUrl(asin: string, size: "sm" | "lg" = "sm") {
  return size === "sm"
    ? `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX44_.jpg`
    : `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX300_.jpg`;
}

export function PurchaseLogTab() {
  const { links, isLoading, refetch } = useMarketPurchaseLinks();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const filtered = links.filter((link) => {
    if (filterStatus === "active" && !link.is_active) return false;
    if (filterStatus === "inactive" && link.is_active) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    if (link.title?.toLowerCase().includes(q)) return true;
    const items = (link.items || []) as LinkItem[];
    return items.some(
      (i) =>
        i.asin?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.title?.toLowerCase().includes(q) ||
        i.supplier_name?.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalItems = filtered.reduce((s, l) => s + ((l.items as LinkItem[]) || []).length, 0);
  const assignedItems = filtered.reduce(
    (s, l) => s + ((l.items as LinkItem[]) || []).filter((i) => i.supplier_name).length,
    0
  );
  const totalCost = filtered.reduce(
    (s, l) =>
      s +
      ((l.items as LinkItem[]) || []).reduce((a, i) => a + (i.unit_cost || 0) * (i.qty || 0), 0),
    0
  );

  const hasActiveFilters = search || filterStatus !== "all";

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/market-purchase/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Links", value: filtered.length, icon: Link2 },
          { label: "Total Items", value: totalItems, icon: Package },
          { label: "Assigned", value: `${assignedItems}/${totalItems}`, icon: Package },
          { label: "Est. Cost", value: `AED ${totalCost.toFixed(0)}`, icon: Package },
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
            placeholder="Search title, ASIN, SKU, supplier..."
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
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Link Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Link2 className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-foreground">No purchase links found</p>
            <p className="text-sm text-muted-foreground mt-1">Create a purchase link from the Daily Orders tab.</p>
          </div>
        ) : (
          filtered.map((link) => {
            const items = (link.items || []) as LinkItem[];
            const isExpanded = expandedRows.has(link.id);
            const assigned = items.filter((i) => i.supplier_name).length;
            const linkCost = items.reduce((a, i) => a + (i.unit_cost || 0) * (i.qty || 0), 0);

            return (
              <div key={link.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Card Header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => toggleRow(link.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{link.title || "Untitled Link"}</p>
                      <Badge variant={link.is_active ? "default" : "secondary"} className="text-[10px] h-5">
                        {link.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {link.platform && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${platformDotColors[link.platform] || "bg-muted-foreground"}`} />
                          {link.platform.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{format(new Date(link.created_at), "dd MMM yyyy")}</span>
                      <span>•</span>
                      <span>{items.length} items</span>
                      <span>•</span>
                      <span>{assigned} assigned</span>
                      {linkCost > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-primary">AED {linkCost.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(link.link_token)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(`/market-purchase/${link.link_token}`, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border px-3 py-3 space-y-4 bg-muted/5">
                    {(() => {
                      const groups = groupBySupplier(items);
                      const sortedKeys = Object.keys(groups).sort((a, b) =>
                        a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)
                      );
                      return sortedKeys.map((supplier) => (
                        <div key={supplier}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {supplier}
                            <span className="ml-2 text-[10px] font-normal">({groups[supplier].length})</span>
                          </p>
                          <div className="grid gap-2">
                            {groups[supplier].map((item, idx) => (
                              <div
                                key={`${item.asin}-${idx}`}
                                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-card"
                              >
                                {/* Image */}
                                <div
                                  className="h-10 w-10 rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0 bg-muted/30"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: getImgUrl(item.asin, "lg"),
                                      title: item.title || item.asin,
                                    })
                                  }
                                >
                                  <img
                                    src={getImgUrl(item.asin, "sm")}
                                    alt=""
                                    className="h-full w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {item.title || "Untitled"}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 min-w-0 overflow-hidden">
                                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                                      {item.asin}
                                    </span>
                                    {item.sku && (
                                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                        · {item.sku}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-semibold">
                                    {item.qty} × AED {(item.unit_cost || 0).toFixed(2)}
                                  </p>
                                  {item.unit_cost > 0 && (
                                    <p className="text-[10px] text-primary font-bold">
                                      AED {(item.qty * item.unit_cost).toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-md p-2">
          {previewImage && (
            <div className="flex flex-col items-center gap-2">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[60vh] object-contain rounded-lg"
              />
              <p className="text-xs text-muted-foreground text-center truncate max-w-full px-2">
                {previewImage.title}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
