import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { format } from "date-fns";

interface LinkItem {
  asin: string;
  sku: string;
  title: string;
  qty: number;
  unit_cost: number;
  noon_image_key?: string;
  supplier_name?: string;
  last_cost_value?: number;
  last_cost_date?: string;
}

interface SupplierOption {
  id: string;
  supplier_name: string;
}

export default function MarketPurchasePublic() {
  const { token } = useParams<{ token: string }>();
  const [linkData, setLinkData] = useState<any>(null);
  const [items, setItems] = useState<LinkItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [savedRows, setSavedRows] = useState<Record<string, boolean>>({});
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const pendingItems = useMemo(() => items.filter(i => !i.supplier_name), [items]);
  const assignedItems = useMemo(() => items.filter(i => !!i.supplier_name), [items]);

  const pendingTotal = useMemo(() => pendingItems.reduce((s, i) => s + i.qty * i.unit_cost, 0), [pendingItems]);
  const assignedTotal = useMemo(() => assignedItems.reduce((s, i) => s + i.qty * i.unit_cost, 0), [assignedItems]);
  const total = pendingTotal + assignedTotal;

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

    // Fetch suppliers for this user
    const { data: supplierData } = await supabase.rpc("get_suppliers_for_user" as any, {
      p_user_id: data.user_id,
    });
    if (supplierData && Array.isArray(supplierData)) {
      setSuppliers(supplierData as SupplierOption[]);
    }

    // Fetch last cost dates for all ASINs
    const asins = linkItems.map(i => i.asin).filter(Boolean);
    if (asins.length > 0) {
      const { data: costData } = await supabase.rpc("get_cost_dates_for_asins" as any, {
        p_user_id: data.user_id,
        p_asins: asins,
      });
      if (costData && Array.isArray(costData)) {
        const costMap: Record<string, { unit_cost: number; updated_at: string }> = {};
        for (const c of costData) {
          costMap[c.asin] = { unit_cost: c.unit_cost, updated_at: c.updated_at };
        }
        for (const item of linkItems) {
          const cost = costMap[item.asin];
          if (cost) {
            item.last_cost_value = cost.unit_cost;
            item.last_cost_date = cost.updated_at;
          }
        }
      }
    }

    setItems(linkItems);

    // Fetch product images via RPC (bypasses RLS)
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

    // Use noon_image_key from link items for items missing from product_images
    for (const item of linkItems) {
      if (!map[item.asin] && item.noon_image_key) {
        map[item.asin] = `https://z.nooncdn.com/tr:n-t_400/${item.noon_image_key}.jpg`;
      }
    }

    // Fetch noon images from noon_orders for remaining missing items
    const missingSkus = linkItems
      .filter(i => !map[i.asin] && i.sku)
      .map(i => i.sku);
    if (missingSkus.length > 0) {
      const { data: noonImages } = await supabase.rpc("get_noon_images_for_skus" as any, {
        p_user_id: data.user_id,
        p_skus: missingSkus,
      });
      if (noonImages && Array.isArray(noonImages)) {
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

  const saveRow = useCallback(async (asin: string, updatedItems: LinkItem[]) => {
    if (!linkData) return;
    setSavingRows(prev => ({ ...prev, [asin]: true }));
    setSavedRows(prev => ({ ...prev, [asin]: false }));

    try {
      // Update the link items
      const { error } = await supabase
        .from("market_purchase_links")
        .update({ items: updatedItems as any })
        .eq("id", linkData.id);

      if (error) throw error;

      // Upsert cost into market_item_costs if cost > 0 OR supplier assigned
      const item = updatedItems.find(i => i.asin === asin);
      if (item && (item.unit_cost > 0 || item.supplier_name)) {
        await supabase
          .from("market_item_costs")
          .upsert(
            {
              user_id: linkData.user_id,
              asin: item.asin,
              sku: item.sku,
              title: item.title,
              unit_cost: item.unit_cost || 0,
              supplier_name: item.supplier_name || null,
              source: "link",
            },
            { onConflict: "user_id,asin" }
          );
      }

      // Update local last cost info
      setItems(prev => prev.map(i =>
        i.asin === asin
          ? { ...i, last_cost_value: i.unit_cost || 0, last_cost_date: new Date().toISOString() }
          : i
      ));

      setSavedRows(prev => ({ ...prev, [asin]: true }));
      setTimeout(() => setSavedRows(prev => ({ ...prev, [asin]: false })), 2000);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingRows(prev => ({ ...prev, [asin]: false }));
    }
  }, [linkData]);

  const debouncedSave = useCallback((asin: string, updatedItems: LinkItem[]) => {
    if (saveTimers.current[asin]) clearTimeout(saveTimers.current[asin]);
    saveTimers.current[asin] = setTimeout(() => saveRow(asin, updatedItems), 800);
  }, [saveRow]);

  const handleCostChange = (asin: string, cost: number) => {
    setItems(prev => {
      const updated = prev.map(i => (i.asin === asin ? { ...i, unit_cost: cost } : i));
      debouncedSave(asin, updated);
      return updated;
    });
  };

  const handleSupplierChange = (asin: string, supplierName: string) => {
    setItems(prev => {
      const updated = prev.map(i => (i.asin === asin ? { ...i, supplier_name: supplierName } : i));
      debouncedSave(asin, updated);
      return updated;
    });
  };

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

  const RowStatus = ({ asin }: { asin: string }) => (
    savingRows[asin] ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> :
    savedRows[asin] ? <Check className="h-3.5 w-3.5 text-primary" /> : null
  );

  const ItemImage = ({ item }: { item: LinkItem; className?: string }) => (
    <img
      src={imageMap[item.asin] || `https://m.media-amazon.com/images/P/${item.asin}.01._SCLZZZZZZZ_SX44_.jpg`}
      alt={item.title}
      className="object-contain rounded border bg-white"
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
  );

  const LastCostInfo = ({ item }: { item: LinkItem }) => {
    if (!item.last_cost_value && !item.last_cost_date) return null;
    return (
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {item.last_cost_value != null && item.last_cost_value > 0 && (
          <span>Last: {item.last_cost_value.toFixed(2)}</span>
        )}
        {item.last_cost_date && (
          <span>
            {item.last_cost_value != null && item.last_cost_value > 0 ? " · " : ""}
            {format(new Date(item.last_cost_date), "dd MMM yyyy")}
          </span>
        )}
      </div>
    );
  };

  const renderDesktopTable = (tableItems: LinkItem[], tableTotal: number) => (
    <div className="hidden lg:block border rounded-lg overflow-auto bg-card">
      <table className="w-full text-sm" style={{ minWidth: 700 }}>
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-left px-3 py-2 font-medium text-muted-foreground w-12"></th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Product</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier</th>
            <th className="text-center px-3 py-2 font-medium text-muted-foreground">Qty</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Cost</th>
            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tableItems.map((item) => (
            <tr key={item.asin} className="hover:bg-muted/20">
              <td className="px-3 py-2">
                <div className="w-10 h-10"><ItemImage item={item} /></div>
              </td>
              <td className="px-3 py-2">
                <div className="text-xs text-foreground leading-snug">{item.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[10px] text-muted-foreground">{item.asin}</span>
                  {item.sku && <span className="text-[10px] text-muted-foreground">· {item.sku}</span>}
                </div>
              </td>
              <td className="px-3 py-2">
                <Select
                   
                   value={item.supplier_name || ""}
                   onValueChange={(v) => handleSupplierChange(item.asin, v)}
                 >
                   <SelectTrigger className="h-7 w-full min-w-[120px] text-xs">
                     <SelectValue placeholder="Select" />
                   </SelectTrigger>
                   <SelectContent className="bg-popover z-[100]" position="popper" side="bottom" align="start">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.supplier_name} className="text-xs">
                        {s.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2 text-center font-medium">{item.qty}</td>
              <td className="px-3 py-2">
                <div className="ml-auto w-full max-w-[100px]">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="h-7 text-xs w-full"
                    value={item.unit_cost || ""}
                    onChange={(e) => handleCostChange(item.asin, Number(e.target.value))}
                    placeholder="0.00"
                  />
                  <LastCostInfo item={item} />
                </div>
              </td>
              <td className="px-3 py-2 text-right font-medium text-xs">
                {(item.qty * item.unit_cost).toFixed(2)}
              </td>
              <td className="px-2 py-2"><RowStatus asin={item.asin} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 border-t font-semibold">
            <td colSpan={3} />
            <td className="px-3 py-2 text-center">{tableItems.reduce((s, i) => s + i.qty, 0)}</td>
            <td />
            <td className="px-3 py-2 text-right text-primary">AED {tableTotal.toFixed(2)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderMobileCards = (cardItems: LinkItem[], cardTotal: number) => (
    <div className="lg:hidden space-y-3">
      {cardItems.map((item) => (
        <Card key={item.asin} className="border">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="w-20 h-20 flex-shrink-0">
                <ItemImage item={item} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug font-medium">{item.title}</p>
                <div className="flex items-center gap-2 mt-1.5 min-w-0 overflow-hidden">
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">{item.asin}</span>
                  {item.sku && <span className="text-xs text-muted-foreground truncate max-w-[100px]">· {item.sku}</span>}
                </div>
                <Badge variant="secondary" className="text-xs mt-1.5">Qty: {item.qty}</Badge>
              </div>
              <RowStatus asin={item.asin} />
            </div>

            <div className="mt-3 space-y-2.5">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Supplier</label>
                <Select
                   
                   value={item.supplier_name || ""}
                   onValueChange={(v) => handleSupplierChange(item.asin, v)}
                 >
                   <SelectTrigger className="h-9 text-sm w-full">
                     <SelectValue placeholder="Select supplier" />
                   </SelectTrigger>
                   <SelectContent className="bg-popover z-[100]" position="popper" side="bottom" align="start">
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.supplier_name} className="text-sm">
                        {s.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit Cost (AED)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="h-9 text-sm w-full"
                    value={item.unit_cost || ""}
                    onChange={(e) => handleCostChange(item.asin, Number(e.target.value))}
                    placeholder="0.00"
                  />
                  <LastCostInfo item={item} />
                </div>
                <div className="text-right pb-2">
                  <span className="text-sm font-semibold text-foreground">
                    = {(item.qty * item.unit_cost).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {cardItems.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg border font-semibold text-sm">
          <span className="text-muted-foreground">Total ({cardItems.reduce((s, i) => s + i.qty, 0)} items)</span>
          <span className="text-primary">AED {cardTotal.toFixed(2)}</span>
        </div>
      )}
      {cardItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">No items in this tab</div>
      )}
    </div>
  );

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
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline"><Package className="h-3 w-3 mr-1" /> {items.length} items</Badge>
              <Badge variant="outline">{linkData.platform}</Badge>
              <Badge variant="outline" className="text-primary">AED {total.toFixed(2)}</Badge>
              {assignedItems.length > 0 && (
                <Badge variant="secondary">{assignedItems.length} assigned</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabbed content */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 gap-1.5">
              Pending <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{pendingItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex-1 gap-1.5">
              Assigned <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{assignedItems.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-3">
            {pendingItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">All items have been assigned to a supplier</div>
            ) : (
              <>
                {renderDesktopTable(pendingItems, pendingTotal)}
                {renderMobileCards(pendingItems, pendingTotal)}
              </>
            )}
          </TabsContent>

          <TabsContent value="assigned" className="mt-3">
            {assignedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No items assigned yet</div>
            ) : (
              <>
                {renderDesktopTable(assignedItems, assignedTotal)}
                {renderMobileCards(assignedItems, assignedTotal)}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
