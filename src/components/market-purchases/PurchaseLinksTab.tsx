import { useState, useMemo } from "react";
import { Link2, Package, Copy, ExternalLink, XCircle, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMarketPurchaseLinks } from "@/hooks/useMarketPurchaseLinks";
import { useProductImages } from "@/hooks/useProductImages";
import { toast } from "sonner";
import { format } from "date-fns";

const getAmazonFallbackUrl = (asin: string) =>
  `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX100_.jpg`;

export function PurchaseLinksTab() {
  const { links, deactivateLink, deleteLink } = useMarketPurchaseLinks();
  const { getImageByAsin } = useProductImages();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const getNoonImageUrl = (imageKey: string) =>
    `https://z.nooncdn.com/tr:n-t_400/${imageKey}.jpg`;

  const getProductImageUrl = (asin: string, noonImageKey?: string): string | null => {
    const img = getImageByAsin(asin);
    if (img) return img.image_url;
    if (noonImageKey) return getNoonImageUrl(noonImageKey);
    return getAmazonFallbackUrl(asin);
  };

  const copyLinkToClipboard = (token: string) => {
    const url = `${window.location.origin}/market-purchase/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const filteredLinks = useMemo(() => {
    let list = [...(links || [])];
    if (filterStatus === "active") list = list.filter((l) => l.is_active);
    if (filterStatus === "inactive") list = list.filter((l) => !l.is_active);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        (l.title || "").toLowerCase().includes(q) ||
        l.link_token.toLowerCase().includes(q)
      );
    }
    return list;
  }, [links, filterStatus, search]);

  const stats = useMemo(() => {
    const total = links?.length || 0;
    const active = links?.filter((l) => l.is_active).length || 0;
    const inactive = total - active;
    const totalItems = (links || []).reduce((s, l) => s + (Array.isArray(l.items) ? l.items.length : 0), 0);
    return { total, active, inactive, totalItems };
  }, [links]);

  return (
    <div className="space-y-5">
      {/* Compact Stat Bar */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Total Links</span>
          <span className="text-sm font-bold text-foreground">{stats.total}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Active</span>
          <span className="text-sm font-bold text-foreground">{stats.active}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          <span className="text-xs text-muted-foreground">Inactive</span>
          <span className="text-sm font-bold text-foreground">{stats.inactive}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 bg-primary/5 px-3 py-1 rounded-lg">
          <Package className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Total Items</span>
          <span className="text-sm font-bold text-primary">{stats.totalItems}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-card border border-border">
        <div className="flex gap-1">
          {(["all", "active", "inactive"] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? "default" : "outline"}
              className="h-8 text-xs capitalize"
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search links..."
            className="pl-9 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground">{filteredLinks.length} of {stats.total}</span>
      </div>

      {/* Links List */}
      {filteredLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Link2 className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-foreground">
            {stats.total === 0 ? "No purchase links yet" : "No links match your filters"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total === 0
              ? "Generate purchase links from the Daily Orders tab."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredLinks.map((link) => {
            const linkItems = (link.items || []) as any[];
            const itemCount = linkItems.length;
            const totalQty = linkItems.reduce((s: number, i: any) => s + (i.qty || 0), 0);
            const hasAssignedItems = linkItems.some((i: any) => i.supplier_name || i.supplier);
            return (
              <Card key={link.id} className={`border bg-card hover:shadow-md transition-shadow ${link.is_active ? "border-border" : "border-border/50 opacity-60"}`}>
                <CardContent className="py-3 px-4">
                  {/* Mobile layout */}
                  <div className="flex flex-col gap-3 sm:hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{link.title || "Untitled Link"}</p>
                        <Badge variant={link.is_active ? "default" : "secondary"} className="text-[10px] h-5 flex-shrink-0">
                          {link.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex -space-x-2 overflow-x-auto pb-1">
                      {linkItems.slice(0, 6).map((item: any, i: number) => {
                        const imgUrl = item.asin ? getProductImageUrl(item.asin) : null;
                        const hasFailed = failedImages.has(item.asin);
                        return (
                          <div key={i} className="h-14 w-14 rounded-lg border-2 border-card bg-muted/30 overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0" style={{ zIndex: 6 - i }}>
                            {imgUrl && !hasFailed ? (
                              <img src={imgUrl} alt={item.title || item.asin} className="h-full w-full object-contain p-0.5" loading="lazy" onError={() => setFailedImages(prev => new Set(prev).add(item.asin))} />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                        );
                      })}
                      {itemCount > 6 && (
                        <div className="h-14 w-14 rounded-lg border-2 border-card bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shadow-sm flex-shrink-0">
                          +{itemCount - 6}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{itemCount} items</span>
                        <span>•</span>
                        <span>{totalQty} qty</span>
                        <span>•</span>
                        <span>{format(new Date(link.created_at), "MMM d, h:mm a")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => copyLinkToClipboard(link.link_token)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => window.open(`/market-purchase/${link.link_token}`, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                        </Button>
                        {link.is_active ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deactivateLink.mutate(link.id)} disabled={hasAssignedItems} title={hasAssignedItems ? "Cannot deactivate: has assigned items" : "Deactivate"}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteLink.mutate(link.id)} disabled={hasAssignedItems} title={hasAssignedItems ? "Cannot delete: has assigned items" : "Delete"}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:flex items-start gap-3">
                    <div className="flex -space-x-3 flex-shrink-0 pt-0.5">
                      {linkItems.slice(0, 4).map((item: any, i: number) => {
                        const imgUrl = item.asin ? getProductImageUrl(item.asin) : null;
                        const hasFailed = failedImages.has(item.asin);
                        return (
                          <div key={i} className="h-12 w-12 rounded-lg border-2 border-card bg-muted/30 overflow-hidden flex items-center justify-center shadow-sm" style={{ zIndex: 4 - i }}>
                            {imgUrl && !hasFailed ? (
                              <img src={imgUrl} alt={item.title || item.asin} className="h-full w-full object-contain p-0.5" loading="lazy" onError={() => setFailedImages(prev => new Set(prev).add(item.asin))} />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground/40" />
                            )}
                          </div>
                        );
                      })}
                      {itemCount > 4 && (
                        <div className="h-12 w-12 rounded-lg border-2 border-card bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shadow-sm">
                          +{itemCount - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{link.title || "Untitled Link"}</p>
                        <Badge variant={link.is_active ? "default" : "secondary"} className="text-[10px] h-5">
                          {link.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{itemCount} items</span>
                        <span>•</span>
                        <span>{totalQty} qty</span>
                        <span>•</span>
                        <span>{format(new Date(link.created_at), "MMM d, yyyy h:mm a")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLinkToClipboard(link.link_token)} title="Copy link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`/market-purchase/${link.link_token}`, "_blank")} title="Open link">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      {link.is_active ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deactivateLink.mutate(link.id)} disabled={hasAssignedItems} title={hasAssignedItems ? "Cannot deactivate: has assigned items" : "Deactivate link"}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteLink.mutate(link.id)} disabled={hasAssignedItems} title={hasAssignedItems ? "Cannot delete: has assigned items" : "Delete link"}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
