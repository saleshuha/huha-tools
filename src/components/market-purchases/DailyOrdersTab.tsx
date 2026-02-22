import { useState, useEffect, useMemo } from "react";
import { CalendarDays, Package, Link2, ChevronLeft, ChevronRight, RotateCcw, ShoppingBag, TrendingUp, ExternalLink, Copy, XCircle, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
import { useMarketPurchaseLinks } from "@/hooks/useMarketPurchaseLinks";
import { useProductImages } from "@/hooks/useProductImages";
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

const getAmazonFallbackUrl = (asin: string) =>
  `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX100_.jpg`;

export function DailyOrdersTab() {
  const { profile } = useUserProfile();
  const { getCostByAsin } = useMarketItemCosts();
  const { links, deactivateLink } = useMarketPurchaseLinks();
  const { getImageByAsin } = useProductImages();

  const getProductImageUrl = (asin: string): string | null => {
    const img = getImageByAsin(asin);
    if (img) return img.image_url;
    return getAmazonFallbackUrl(asin);
  };
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ConsolidatedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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

      const normalize = (val: string | null | undefined) => (val || "").trim().toUpperCase();

      const findOrCreateKey = (asin: string, sku: string): string => {
        const normAsin = normalize(asin);
        const normSku = normalize(sku);
        for (const [key] of Object.entries(consolidated)) {
          if (normAsin && normalize(consolidated[key].asin) === normAsin) return key;
          if (normSku && normalize(consolidated[key].sku) === normSku) return key;
        }
        return normAsin || normSku || "unknown";
      };

      (amazonOrders || []).forEach((o: any) => {
        const key = findOrCreateKey(o.asin, o.sku);
        if (!consolidated[key]) {
          consolidated[key] = { asin: o.asin || "", sku: o.sku || "", title: o.item_title || "", amazonQty: 0, noonQty: 0, totalQty: 0, unitCost: 0 };
        }
        consolidated[key].amazonQty += Number(o.item_quantity || 1);
        if (!consolidated[key].sku && o.sku) consolidated[key].sku = o.sku;
        if (!consolidated[key].title && o.item_title) consolidated[key].title = o.item_title;
      });

      (noonOrders || []).forEach((o: any) => {
        const key = findOrCreateKey(o.partner_sku, o.sku);
        if (!consolidated[key]) {
          consolidated[key] = { asin: o.partner_sku || "", sku: o.sku || "", title: o.title || "", amazonQty: 0, noonQty: 0, totalQty: 0, unitCost: 0 };
        }
        consolidated[key].noonQty += Number(o.quantity || 1);
        if (!consolidated[key].title && o.title) consolidated[key].title = o.title;
        if (!consolidated[key].asin && o.partner_sku) consolidated[key].asin = o.partner_sku;
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

  const recentLinks = useMemo(() => links.slice(0, 5), [links]);

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

  const copyLinkToClipboard = (token: string) => {
    const url = `${window.location.origin}/market-purchase/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
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
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[68px]"></th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">ASIN</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">SKU</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">AMZ</th>
                <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Noon</th>
                <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Unit Cost</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.asin} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                   <td className="px-3 py-2">
                    {(() => {
                      const imgUrl = item.asin ? getProductImageUrl(item.asin) : null;
                      const hasFailed = failedImages.has(item.asin);
                      return (
                        <div
                          className="h-14 w-14 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => imgUrl && !hasFailed && setPreviewImage({ url: imgUrl, title: item.title })}
                        >
                          {imgUrl && !hasFailed ? (
                            <img
                              src={imgUrl}
                              alt={item.title}
                              className="h-full w-full object-contain p-0.5"
                              loading="lazy"
                              onError={() => setFailedImages(prev => new Set(prev).add(item.asin))}
                            />
                          ) : (
                            <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-foreground">{item.asin}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.sku}</td>
                  <td className="px-3 py-2.5 text-xs max-w-[200px] truncate text-foreground">{item.title}</td>
                  <td className="px-3 py-2.5 text-center">
                    {item.amazonQty > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        {item.amazonQty}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {item.noonQty > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        {item.noonQty}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-foreground">{item.totalQty}</td>
                  <td className="px-3 py-2.5">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-7 w-20 text-xs ml-auto block"
                      value={item.unitCost}
                      onChange={(e) => handleCostChange(item.asin, Number(e.target.value))}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-foreground">{(item.totalQty * item.unitCost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td colSpan={6} className="px-3 py-3 text-right font-semibold text-sm text-muted-foreground">Grand Total:</td>
                <td className="px-3 py-3 text-center font-bold text-foreground">{items.reduce((s, i) => s + i.totalQty, 0)}</td>
                <td />
                <td className="px-3 py-3 text-right font-bold text-lg text-primary">AED {grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Generated Purchase Links Section */}
      {recentLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Generated Purchase Links
            </h3>
            <span className="text-xs text-muted-foreground">{links.length} total</span>
          </div>
          <div className="grid gap-3">
            {recentLinks.map((link) => {
              const linkItems = (link.items || []) as any[];
              const itemCount = linkItems.length;
              const totalQty = linkItems.reduce((s: number, i: any) => s + (i.qty || 0), 0);
              return (
                <Card key={link.id} className={`border bg-card hover:shadow-md transition-shadow ${link.is_active ? "border-border" : "border-border/50 opacity-60"}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      {/* Preview thumbnails */}
                      <div className="flex -space-x-3 flex-shrink-0 pt-0.5">
                        {linkItems.slice(0, 4).map((item: any, i: number) => {
                          const imgUrl = item.asin ? getProductImageUrl(item.asin) : null;
                          const hasFailed = failedImages.has(item.asin);
                          return (
                            <div key={i} className="h-12 w-12 rounded-lg border-2 border-card bg-muted/30 overflow-hidden flex items-center justify-center shadow-sm" style={{ zIndex: 4 - i }}>
                              {imgUrl && !hasFailed ? (
                                <img
                                  src={imgUrl}
                                  alt={item.title || item.asin}
                                  className="h-full w-full object-contain p-0.5"
                                  loading="lazy"
                                  onError={() => setFailedImages(prev => new Set(prev).add(item.asin))}
                                />
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

                      {/* Link info */}
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

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLinkToClipboard(link.link_token)} title="Copy link">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`/market-purchase/${link.link_token}`, "_blank")} title="Open link">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        {link.is_active && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deactivateLink.mutate(link.id)} title="Deactivate link">
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <GenerateMarketLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        items={items.map((i) => ({ asin: i.asin, sku: i.sku, title: i.title, qty: i.totalQty, unit_cost: i.unitCost }))}
      />

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-sm p-4">
          {previewImage && (
            <div className="space-y-3">
              <img src={previewImage.url} alt={previewImage.title} className="w-full h-auto rounded-lg" />
              <p className="text-sm text-muted-foreground text-center line-clamp-2">{previewImage.title}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
