import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Trash2, RefreshCw, Filter, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { NewPurchaseDialog } from "./NewPurchaseDialog";
import { useMarketPurchases, type MarketPurchase } from "@/hooks/useMarketPurchases";

const platformBorderColors: Record<string, string> = {
  amazon: "border-l-orange-500",
  noon: "border-l-yellow-500",
  both: "border-l-sky-500",
  po: "border-l-purple-500",
};

const platformDotColors: Record<string, string> = {
  amazon: "bg-orange-500",
  noon: "bg-yellow-500",
  both: "bg-sky-500",
  po: "bg-purple-500",
};

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  reconciled: "bg-sky-500/10 text-sky-700 border-sky-200",
};

export function PurchaseLogTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { purchases, isLoading, createPurchase, deletePurchase, refetch } = useMarketPurchases({
    platform: filterPlatform !== "all" ? filterPlatform : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    date_from: filterDateFrom || undefined,
    date_to: filterDateTo || undefined,
  });

  const filtered = purchases.filter((p) => {
    if (!filterSupplier) return true;
    const name = p.supplier?.supplier_name || "";
    return name.toLowerCase().includes(filterSupplier.toLowerCase());
  });

  const totalValue = filtered.reduce((s, p) => s + Number(p.total_estimated_cost || 0), 0);
  const hasActiveFilters = filterSupplier || filterPlatform !== "all" || filterStatus !== "all" || filterDateFrom || filterDateTo;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setFilterSupplier("");
    setFilterPlatform("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" /> New Purchase
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        <div className="flex-1" />

        {filtered.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium">{filtered.length} purchases</span>
            <span>•</span>
            <span className="font-semibold text-primary">AED {totalValue.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Input
              className="h-8 w-44"
              placeholder="Filter supplier..."
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
            />
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="amazon">Amazon</SelectItem>
                <SelectItem value="noon">Noon</SelectItem>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="po">PO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="reconciled">Reconciled</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="h-8 w-36" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            <Input type="date" className="h-8 w-36" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border">
              <TableHead className="w-8" />
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Date</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Supplier</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Platform</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Items</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Est. Total</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Package className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-foreground">No purchases found</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "New Purchase" to log your first market buy.</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((purchase, idx) => (
                <>
                  <TableRow
                    key={purchase.id}
                    className={`cursor-pointer hover:bg-muted/20 transition-colors border-l-4 ${platformBorderColors[purchase.platform] || "border-l-transparent"} ${idx % 2 === 0 ? "" : "bg-muted/5"}`}
                    onClick={() => toggleRow(purchase.id)}
                  >
                    <TableCell className="px-2">
                      {expandedRows.has(purchase.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {format(new Date(purchase.purchase_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {purchase.supplier?.supplier_name || (
                        <span className="text-muted-foreground italic text-xs">No supplier</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={`h-2 w-2 rounded-full ${platformDotColors[purchase.platform] || ""}`} />
                        {purchase.platform.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{purchase.items?.length || 0} items</TableCell>
                    <TableCell className="font-semibold text-sm">
                      AED {Number(purchase.total_estimated_cost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusStyles[purchase.status] || ""}`}>
                        {purchase.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                      {purchase.status !== "reconciled" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            if (window.confirm("Delete this purchase?")) {
                              deletePurchase.mutate(purchase.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {expandedRows.has(purchase.id) && (
                    <TableRow key={`${purchase.id}-expanded`} className="bg-muted/5">
                      <TableCell colSpan={8} className="px-6 py-4">
                        {!purchase.items || purchase.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No items in this purchase.</p>
                        ) : (
                          <div className="grid gap-2">
                            {purchase.items.map((item) => (
                              <div key={item.id} className={`flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card border-l-4 ${platformBorderColors[item.platform] || "border-l-transparent"}`}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{item.title || "Untitled"}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.asin || "—"} · {item.sku || "—"}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-semibold">{item.quantity} × AED {Number(item.unit_cost).toFixed(2)}</p>
                                  <p className="text-xs text-primary font-bold">AED {(item.quantity * item.unit_cost).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewPurchaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => {
          createPurchase.mutate(data, { onSuccess: () => setDialogOpen(false) });
        }}
        isLoading={createPurchase.isPending}
      />
    </div>
  );
}
