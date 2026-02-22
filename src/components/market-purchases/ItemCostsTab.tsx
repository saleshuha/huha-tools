import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload, Search, Trash2, Pencil, Link, ShoppingCart, Check, X, Package, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { AddCostDialog } from "./AddCostDialog";
import { BulkCostUploadDialog } from "./BulkCostUploadDialog";
import { format } from "date-fns";

const sourceConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  manual: { icon: <Pencil className="h-3 w-3" />, label: "Manual", className: "bg-sky-500/10 text-sky-700 border-sky-200" },
  link: { icon: <Link className="h-3 w-3" />, label: "Link", className: "bg-purple-500/10 text-purple-700 border-purple-200" },
  purchase: { icon: <ShoppingCart className="h-3 w-3" />, label: "Purchase", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
};

interface CostHistoryEntry {
  asin: string;
  unit_cost: number;
  recorded_date: string;
  supplier_name: string | null;
}

function getImgUrl(asin: string) {
  return `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX44_.jpg`;
}

export function ItemCostsTab() {
  const [search, setSearch] = useState("");
  const { costs, isLoading, deleteCost, upsertCost } = useMarketItemCosts(search);
  const { profile } = useUserProfile();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(0);

  // Fetch cost history for all tracked ASINs
  const { data: costHistory = [] } = useQuery({
    queryKey: ["asin_cost_history_all", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("asin_cost_history")
        .select("asin, unit_cost, recorded_date, supplier_name")
        .eq("user_id", profile.id)
        .order("recorded_date", { ascending: false });
      if (error) throw error;
      return (data || []) as CostHistoryEntry[];
    },
    enabled: !!profile?.id,
  });

  // Group history by ASIN (most recent 3 per ASIN)
  const historyByAsin = useMemo(() => {
    const map: Record<string, CostHistoryEntry[]> = {};
    costHistory.forEach((h) => {
      if (!map[h.asin]) map[h.asin] = [];
      if (map[h.asin].length < 3) map[h.asin].push(h);
    });
    return map;
  }, [costHistory]);

  const avgCost = useMemo(() => {
    if (costs.length === 0) return 0;
    return costs.reduce((s, c) => s + c.unit_cost, 0) / costs.length;
  }, [costs]);

  const lastUpdated = useMemo(() => {
    if (costs.length === 0) return null;
    return costs.reduce((latest, c) => (new Date(c.updated_at) > new Date(latest.updated_at) ? c : latest)).updated_at;
  }, [costs]);

  const handleInlineEdit = (id: string, currentCost: number) => {
    setEditingId(id);
    setEditCost(currentCost);
  };

  const handleSaveEdit = (item: any) => {
    upsertCost.mutate({ asin: item.asin, sku: item.sku, title: item.title, unit_cost: editCost, supplier_name: item.supplier_name, source: item.source });
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border border-border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items Tracked</p>
              <p className="text-lg font-bold text-foreground">{costs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Cost</p>
              <p className="text-lg font-bold text-foreground">AED {avgCost.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm font-medium text-foreground">{lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-card border border-border">
        <Button size="sm" onClick={() => setAddOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" /> Add Cost
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" /> Upload CSV
        </Button>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ASIN, SKU, title..."
            className="pl-9 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : costs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <DollarSign className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-foreground mb-1">No saved costs yet</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">Start tracking item costs by adding them manually or uploading a CSV file.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Cost
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Upload CSV
            </Button>
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-auto bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Product</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Current Cost</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">History 1</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">History 2</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">History 3</th>
                <th className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                <th className="px-2 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {costs.map((c, idx) => {
                const src = sourceConfig[c.source] || sourceConfig.manual;
                const history = historyByAsin[c.asin] || [];
                return (
                  <tr key={c.id} className={`group border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                    {/* Product Column */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-md border overflow-hidden flex-shrink-0 bg-muted/30">
                          <img
                            src={getImgUrl(c.asin)}
                            alt=""
                            className="h-full w-full object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate max-w-[260px]">{c.title || "—"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] text-muted-foreground">{c.asin}</span>
                            {c.sku && (
                              <span className="text-[10px] text-muted-foreground">· {c.sku}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Current Cost */}
                    <td className="px-4 py-2.5 text-right">
                      {editingId === c.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="h-7 w-20 text-xs"
                            value={editCost}
                            onChange={(e) => setEditCost(Number(e.target.value))}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(c)}
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => handleSaveEdit(c)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="cursor-pointer hover:text-primary transition-colors font-semibold text-xs" onClick={() => handleInlineEdit(c.id, c.unit_cost)}>
                          AED {c.unit_cost.toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* History Columns */}
                    {[0, 1, 2].map((i) => (
                      <td key={i} className="px-3 py-2.5 text-right">
                        {history[i] ? (
                          <div>
                            <p className="text-xs font-medium text-foreground">AED {history[i].unit_cost.toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(history[i].recorded_date), "dd MMM")}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                    ))}

                    {/* Source */}
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[10px] gap-1 ${src.className}`}>
                        {src.icon}
                        {src.label}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleInlineEdit(c.id, c.unit_cost)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteCost.mutate(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddCostDialog open={addOpen} onOpenChange={setAddOpen} />
      <BulkCostUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}
