import { useState, useEffect, useMemo } from "react";
import { CalendarDays, Package, Link2, ChevronLeft, ChevronRight, RotateCcw, ShoppingBag, TrendingUp, ImageOff, FileDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
// Purchase links now managed in PurchaseLinksTab
import { useProductImages } from "@/hooks/useProductImages";
import { GenerateMarketLinkDialog } from "./GenerateMarketLinkDialog";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import jsPDF from "jspdf";

interface ConsolidatedItem {
  asin: string;
  sku: string;
  title: string;
  amazonQty: number;
  noonQty: number;
  totalQty: number;
  unitCost: number;
  costDate?: string;
  noonImageKey?: string;
}

const getAmazonFallbackUrl = (asin: string) =>
  `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX100_.jpg`;

export function DailyOrdersTab() {
  const { profile } = useUserProfile();
  const { } = useMarketItemCosts();
  
  const { getImageByAsin } = useProductImages();

  const getNoonImageUrl = (imageKey: string) =>
    `https://z.nooncdn.com/tr:n-t_400/${imageKey}.jpg`;

  const getProductImageUrl = (asin: string, noonImageKey?: string): string | null => {
    const img = getImageByAsin(asin);
    if (img) return img.image_url;
    if (noonImageKey) return getNoonImageUrl(noonImageKey);
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
        .select("sku, title, quantity, partner_sku, image_key")
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
          consolidated[key] = { asin: o.partner_sku || "", sku: o.sku || "", title: o.title || "", amazonQty: 0, noonQty: 0, totalQty: 0, unitCost: 0, noonImageKey: o.image_key || undefined };
        }
        consolidated[key].noonQty += Number(o.quantity || 1);
        if (!consolidated[key].title && o.title) consolidated[key].title = o.title;
        if (!consolidated[key].asin && o.partner_sku) consolidated[key].asin = o.partner_sku;
        if (!consolidated[key].noonImageKey && o.image_key) consolidated[key].noonImageKey = o.image_key;
      });

      const result = Object.values(consolidated);
      for (const item of result) {
        item.totalQty = item.amazonQty + item.noonQty;
        if (!profile?.id) continue;
        const { data } = await supabase
          .from("market_item_costs")
          .select("unit_cost, updated_at")
          .eq("user_id", profile.id)
          .eq("asin", item.asin)
          .limit(1)
          .maybeSingle();
        if (data) {
          item.unitCost = data.unit_cost;
          item.costDate = data.updated_at;
        }
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


  const goToDate = (dir: "prev" | "next" | "today") => {
    if (dir === "today") setSelectedDate(new Date().toISOString().split("T")[0]);
    else if (dir === "prev") setSelectedDate(subDays(new Date(selectedDate), 1).toISOString().split("T")[0]);
    else setSelectedDate(addDays(new Date(selectedDate), 1).toISOString().split("T")[0]);
  };

  // Cost is read-only here — managed via Purchase Links only

  const exportPDF = () => {
    if (items.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const dateStr = format(new Date(selectedDate), 'dd MMM yyyy');

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Daily Orders - ${dateStr}`, 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 24);
    doc.setTextColor(0);

    // Table config
    const cols = [
      { header: '#', x: 14, w: 10, align: 'center' as const },
      { header: 'ASIN / SKU', x: 24, w: 35, align: 'left' as const },
      { header: 'Title', x: 59, w: 95, align: 'left' as const },
      { header: 'Source', x: 154, w: 25, align: 'center' as const },
      { header: 'Qty', x: 179, w: 18, align: 'center' as const },
      { header: 'Unit Cost', x: 197, w: 28, align: 'right' as const },
      { header: 'Line Total', x: 225, w: 30, align: 'right' as const },
    ];
    const rowH = 8;
    let y = 32;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 1, pageW - 28, rowH, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    cols.forEach(c => {
      const tx = c.align === 'right' ? c.x + c.w - 2 : c.align === 'center' ? c.x + c.w / 2 : c.x + 2;
      doc.text(c.header, tx, y + 4.5, { align: c.align });
    });
    y += rowH;
    doc.setTextColor(0);

    // Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    items.forEach((item, idx) => {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 18;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(248, 248, 248);
        doc.rect(14, y - 1, pageW - 28, rowH, 'F');
      }

      const source = [item.amazonQty > 0 ? 'AMZ' : '', item.noonQty > 0 ? 'Noon' : ''].filter(Boolean).join(' / ');
      const lineTotal = (item.totalQty * item.unitCost).toFixed(2);
      const titleTrunc = item.title.length > 65 ? item.title.substring(0, 62) + '...' : item.title;

      doc.text(String(idx + 1), 14 + 5, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(item.asin || '—', 26, y + 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(120);
      doc.text(item.sku || '—', 26, y + 6.5);
      doc.setTextColor(0);
      doc.setFontSize(7.5);
      doc.text(titleTrunc, 61, y + 4.5);
      doc.text(source, 154 + 12.5, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.totalQty), 179 + 9, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(item.unitCost > 0 ? item.unitCost.toFixed(2) : '—', 225, y + 4.5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(lineTotal, 255, y + 4.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += rowH;
    });

    // Footer totals
    y += 2;
    doc.setDrawColor(0, 120, 200);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageW - 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Items: ${items.reduce((s, i) => s + i.totalQty, 0)}`, 14, y);
    doc.text(`Grand Total: AED ${grandTotal.toFixed(2)}`, pageW - 14, y, { align: 'right' });

    doc.save(`daily-orders-${selectedDate}.pdf`);
    toast.success('PDF exported successfully');
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
          variant="outline"
          size="sm"
          className="h-8"
          onClick={exportPDF}
          disabled={items.length === 0}
        >
          <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF Export
        </Button>
        <Button
          size="sm"
          className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          onClick={() => setLinkDialogOpen(true)}
          disabled={items.length === 0}
        >
          <Link2 className="h-3.5 w-3.5 mr-1.5" /> Generate Purchase Link
        </Button>
      </div>

      {/* Compact Stat Bar */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border overflow-x-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 flex-shrink-0">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-xs text-muted-foreground">AMZ</span>
          <span className="text-sm font-bold text-foreground">{amazonTotal}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 flex-shrink-0">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-muted-foreground">Noon</span>
          <span className="text-sm font-bold text-foreground">{noonTotal}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 flex-shrink-0">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Products</span>
          <span className="text-sm font-bold text-foreground">{items.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 flex-shrink-0">
          <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Total Qty</span>
          <span className="text-sm font-bold text-foreground">{amazonTotal + noonTotal}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 flex-shrink-0">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-bold text-primary">AED {grandTotal.toFixed(2)}</span>
        </div>
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
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {items.map((item, idx) => {
              const imgUrl = item.asin ? getProductImageUrl(item.asin, item.noonImageKey) : (item.noonImageKey ? getNoonImageUrl(item.noonImageKey) : null);
              const hasFailed = failedImages.has(item.asin);
              return (
                <Card key={item.asin || idx} className="border bg-card">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div
                        className="h-20 w-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0"
                        onClick={() => imgUrl && !hasFailed && setPreviewImage({ url: imgUrl, title: item.title })}
                      >
                        {imgUrl && !hasFailed ? (
                          <img src={imgUrl} alt={item.title} className="h-full w-full object-contain p-0.5" loading="lazy" onError={() => setFailedImages(prev => new Set(prev).add(item.asin))} />
                        ) : (
                          <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm text-foreground leading-snug font-medium line-clamp-2">{item.title}</p>
                        <div className="flex items-center gap-1 mt-1 min-w-0 overflow-hidden">
                          <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{item.asin}</span>
                          {item.sku && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">· {item.sku}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {item.amazonQty > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-muted">
                          <span className="h-2 w-2 rounded-full bg-orange-500" /> AMZ: {item.amazonQty}
                        </span>
                      )}
                      {item.noonQty > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-muted">
                          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Noon: {item.noonQty}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">Total: {item.totalQty}</Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Unit Cost</p>
                        {item.unitCost > 0 ? (
                          <div>
                            <span className="text-sm font-semibold text-foreground">{item.unitCost.toFixed(2)}</span>
                            {item.costDate && (
                              <span className="text-[10px] text-muted-foreground ml-1.5">
                                {format(new Date(item.costDate), 'dd MMM yyyy')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Line Total</p>
                        <span className="text-sm font-bold text-primary">{(item.totalQty * item.unitCost).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5 rounded-lg border-2 border-primary/20 font-semibold text-sm">
              <span className="text-muted-foreground">Grand Total ({items.reduce((s, i) => s + i.totalQty, 0)} items)</span>
              <span className="text-primary text-lg">AED {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[92px]"></th>
                  <th className="text-left px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                  <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Unit Cost</th>
                  <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.asin} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                     <td className="px-3 py-2">
                      {(() => {
                        const imgUrl = item.asin ? getProductImageUrl(item.asin, item.noonImageKey) : (item.noonImageKey ? getNoonImageUrl(item.noonImageKey) : null);
                        const hasFailed = failedImages.has(item.asin);
                        return (
                          <div
                            className="h-20 w-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
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
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <div className="text-xs text-foreground leading-snug line-clamp-2">{item.title}</div>
                      <div className="flex items-center gap-2 mt-1 min-w-0 overflow-hidden">
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{item.asin}</span>
                        {item.sku && <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">· {item.sku}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.amazonQty > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                            AMZ
                          </span>
                        )}
                        {item.noonQty > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-muted">
                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                            Noon
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-foreground">{item.totalQty}</td>
                    <td className="px-3 py-2.5 text-right">
                      {item.unitCost > 0 ? (
                        <div>
                          <span className="font-semibold text-foreground">{item.unitCost.toFixed(2)}</span>
                          {item.costDate && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(item.costDate), 'dd MMM yyyy')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-foreground">{(item.totalQty * item.unitCost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 border-t-2 border-primary/20">
                  <td colSpan={4} className="px-3 py-3 text-right font-semibold text-sm text-muted-foreground">Grand Total:</td>
                  <td className="px-3 py-3 text-center font-bold text-foreground">{items.reduce((s, i) => s + i.totalQty, 0)}</td>
                  <td className="px-3 py-3 text-right font-bold text-lg text-primary">AED {grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}


      <GenerateMarketLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        items={items.map((i) => ({ asin: i.asin, sku: i.sku, title: i.title, qty: i.totalQty, unit_cost: i.unitCost, noon_image_key: i.noonImageKey }))}
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
