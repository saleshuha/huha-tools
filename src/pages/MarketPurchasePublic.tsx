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
    setItems((data.items as any as LinkItem[]) || []);
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

        {/* Items table */}
        <div className="border rounded-lg overflow-auto bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-12">Image</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">ASIN</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">SKU</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
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
                      src={`https://m.media-amazon.com/images/P/${item.asin}.01._SCLZZZZZZZ_SX44_.jpg`}
                      alt={item.title}
                      className="w-10 h-10 object-contain rounded border bg-white"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{item.asin}</td>
                  <td className="px-3 py-2 text-xs">{item.sku}</td>
                  <td className="px-3 py-2 text-xs max-w-[200px] truncate">{item.title}</td>
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
                <td colSpan={4} />
                <td className="px-3 py-2 text-center">{items.reduce((s, i) => s + i.qty, 0)}</td>
                <td />
                <td className="px-3 py-2 text-right text-primary">AED {total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
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
