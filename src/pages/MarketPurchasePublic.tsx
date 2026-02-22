import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Send, Package } from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";

interface LinkItem {
  asin: string;
  sku: string;
  title: string;
  qty: number;
  unit_cost: number;
}

export default function MarketPurchasePublic() {
  const { token } = useParams<{ token: string }>();
  const [linkData, setLinkData] = useState<any>(null);
  const [items, setItems] = useState<LinkItem[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    fetchLink();
  }, [token]);

  const fetchLink = async () => {
    const { data, error } = await supabase
      .from("market_purchase_links")
      .select("*")
      .eq("link_token", token)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setLinkData(data);
    const linkItems = (data.items as any as LinkItem[]) || [];
    setItems(linkItems);

    // Fetch product images via RPC (bypasses RLS)
    const asins = linkItems.map(i => i.asin).filter(Boolean);
    const skus = linkItems.map(i => i.sku).filter(Boolean);
    const map: Record<string, string> = {};

    if (asins.length > 0) {
      const { data: images } = await supabase.rpc("get_product_images_for_asins" as any, {
        p_user_id: data.user_id,
        p_asins: asins,
      });
      if (images && Array.isArray(images)) {
        for (const img of images) {
          map[img.asin] = img.image_url;
        }
      }
    }

    // Fetch noon images for items missing from product_images
    const missingSkus = linkItems
      .filter(i => !map[i.asin] && i.sku)
      .map(i => i.sku);
    if (missingSkus.length > 0) {
      const { data: noonImages } = await supabase.rpc("get_noon_images_for_skus" as any, {
        p_user_id: data.user_id,
        p_skus: missingSkus,
      });
      if (noonImages && Array.isArray(noonImages)) {
        // Map SKU back to ASIN
        const skuToAsin: Record<string, string> = {};
        for (const item of linkItems) {
          if (item.sku) skuToAsin[item.sku] = item.asin;
        }
        for (const img of noonImages) {
          const asin = skuToAsin[img.sku];
          if (asin && !map[asin]) {
            map[asin] = img.image_url;
          }
        }
      }
    }

    setImageMap(map);

    setLoading(false);
  };

  const handleCostChange = (asin: string, cost: number) => {
    setItems((prev) => prev.map((i) => (i.asin === asin ? { ...i, unit_cost: cost } : i)));
  };

  const handleSubmit = async () => {
    if (!linkData) return;
    setSubmitting(true);

    try {
      // Update the link items with costs
      const { error } = await supabase
        .from("market_purchase_links")
        .update({ items: items as any })
        .eq("id", linkData.id);

      if (error) throw error;

      // Upsert costs into market_item_costs for the link owner
      for (const item of items) {
        if (item.unit_cost > 0) {
          await supabase
            .from("market_item_costs")
            .upsert(
              {
                user_id: linkData.user_id,
                asin: item.asin,
                sku: item.sku,
                title: item.title,
                unit_cost: item.unit_cost,
                supplier_name: supplierName || null,
                source: "link",
              },
              { onConflict: "user_id,asin" }
            );
        }
      }

      setSubmitted(true);
      toast.success("Costs submitted successfully!");
    } catch (err) {
      toast.error("Failed to submit costs");
    } finally {
      setSubmitting(false);
    }
  };

  const total = items.reduce((s, i) => s + i.qty * i.unit_cost, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sonner />
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium text-destructive">Invalid or expired link</p>
            <p className="text-sm text-muted-foreground mt-1">This purchase link is no longer active.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sonner />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {linkData.title || "Market Purchase"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <Badge variant="outline"><Package className="h-3 w-3 mr-1" /> {items.length} items</Badge>
              <Badge variant="outline">{linkData.platform}</Badge>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Supplier Name</label>
              <Input
                placeholder="Enter your supplier name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                disabled={submitted}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <div className="space-y-3 md:space-y-0">
          {/* Desktop table */}
          <div className="hidden md:block border rounded-lg overflow-auto bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-12"></th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Cost</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.asin} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <img
                        src={imageMap[item.asin] || `https://m.media-amazon.com/images/P/${item.asin}.01._SCLZZZZZZZ_SX44_.jpg`}
                        alt={item.title}
                        className="w-10 h-10 object-contain rounded border bg-white"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          const fallback = `https://m.media-amazon.com/images/P/${item.asin}.01._SCLZZZZZZZ_SX44_.jpg`;
                          if (el.src !== fallback && imageMap[item.asin]) {
                            el.src = fallback;
                          } else {
                            el.style.display = 'none';
                          }
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-foreground leading-snug">{item.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-muted-foreground">{item.asin}</span>
                        {item.sku && <span className="text-[10px] text-muted-foreground">· {item.sku}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-medium">{item.qty}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-7 w-24 text-xs ml-auto"
                        value={item.unit_cost || ""}
                        onChange={(e) => handleCostChange(item.asin, Number(e.target.value))}
                        disabled={submitted}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-xs">
                      {(item.qty * item.unit_cost).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t font-semibold">
                  <td colSpan={2} />
                  <td className="px-3 py-2 text-center">{items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td />
                  <td className="px-3 py-2 text-right text-primary">AED {total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {items.map((item) => (
              <Card key={item.asin} className="border">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <img
                      src={imageMap[item.asin] || `https://m.media-amazon.com/images/P/${item.asin}.01._SCLZZZZZZZ_SX44_.jpg`}
                      alt={item.title}
                      className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        const fallback = `https://m.media-amazon.com/images/P/${item.asin}.01._SCLZZZZZZZ_SX44_.jpg`;
                        if (el.src !== fallback && imageMap[item.asin]) {
                          el.src = fallback;
                        } else {
                          el.style.display = 'none';
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-muted-foreground">{item.asin}</span>
                        {item.sku && <span className="text-[10px] text-muted-foreground">· {item.sku}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <Badge variant="secondary" className="text-[10px]">Qty: {item.qty}</Badge>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-7 w-20 text-xs"
                        value={item.unit_cost || ""}
                        onChange={(e) => handleCostChange(item.asin, Number(e.target.value))}
                        disabled={submitted}
                        placeholder="Cost"
                      />
                      <span className="text-xs font-semibold text-foreground w-16 text-right">
                        {(item.qty * item.unit_cost).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border font-semibold text-sm">
              <span className="text-muted-foreground">Total ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
              <span className="text-primary">AED {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        {!submitted ? (
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Costs"}
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-lg font-medium text-green-600">✓ Costs submitted successfully</p>
              <p className="text-sm text-muted-foreground mt-1">Thank you! The costs have been saved.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
