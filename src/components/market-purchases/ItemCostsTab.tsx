import { useState } from "react";
import { Plus, Upload, Search, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMarketItemCosts } from "@/hooks/useMarketItemCosts";
import { AddCostDialog } from "./AddCostDialog";
import { BulkCostUploadDialog } from "./BulkCostUploadDialog";

export function ItemCostsTab() {
  const [search, setSearch] = useState("");
  const { costs, isLoading, deleteCost, upsertCost } = useMarketItemCosts(search);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(0);

  const handleInlineEdit = (id: string, currentCost: number) => {
    setEditingId(id);
    setEditCost(currentCost);
  };

  const handleSaveEdit = (item: any) => {
    upsertCost.mutate({ asin: item.asin, sku: item.sku, title: item.title, unit_cost: editCost, supplier_name: item.supplier_name, source: item.source });
    setEditingId(null);
  };

  const sourceColor = (source: string) => {
    switch (source) {
      case "manual": return "bg-blue-100 text-blue-700";
      case "link": return "bg-purple-100 text-purple-700";
      case "purchase": return "bg-green-100 text-green-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Cost
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Upload CSV
        </Button>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ASIN, SKU, title..."
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading costs...</div>
      ) : costs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No saved costs yet. Add costs manually or upload a CSV.</div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">ASIN</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">SKU</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Cost</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Source</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Updated</th>
                <th className="px-2 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {costs.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">{c.asin}</td>
                  <td className="px-3 py-2 text-xs">{c.sku || "—"}</td>
                  <td className="px-3 py-2 text-xs max-w-[200px] truncate">{c.title || "—"}</td>
                  <td className="px-3 py-2 text-right">
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
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSaveEdit(c)}>✓</Button>
                      </div>
                    ) : (
                      <span className="cursor-pointer hover:underline" onClick={() => handleInlineEdit(c.id, c.unit_cost)}>
                        AED {c.unit_cost.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.supplier_name || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge className={`text-[10px] ${sourceColor(c.source)}`} variant="secondary">{c.source}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleInlineEdit(c.id, c.unit_cost)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteCost.mutate(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddCostDialog open={addOpen} onOpenChange={setAddOpen} />
      <BulkCostUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}
