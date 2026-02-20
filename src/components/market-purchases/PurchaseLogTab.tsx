import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { NewPurchaseDialog } from "./NewPurchaseDialog";
import { useMarketPurchases, type MarketPurchase } from "@/hooks/useMarketPurchases";

const platformColors: Record<string, string> = {
  amazon: "bg-amber-100 text-amber-800 border-amber-200",
  noon: "bg-yellow-100 text-yellow-800 border-yellow-200",
  both: "bg-blue-100 text-blue-800 border-blue-200",
  po: "bg-purple-100 text-purple-800 border-purple-200",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  reconciled: "bg-slate-100 text-slate-600 border-slate-200",
};

export function PurchaseLogTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

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

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Purchase
        </Button>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>

        <Input
          className="h-8 w-40"
          placeholder="Filter supplier..."
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
        />

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="noon">Noon</SelectItem>
            <SelectItem value="both">Both</SelectItem>
            <SelectItem value="po">PO</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="h-8 w-36"
          placeholder="From"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
        />
        <Input
          type="date"
          className="h-8 w-36"
          placeholder="To"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
        />

        {filtered.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} purchases</span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8" />
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Est. Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No purchases found. Click "New Purchase" to log your first market buy.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((purchase) => (
                <>
                  <TableRow
                    key={purchase.id}
                    className="cursor-pointer hover:bg-muted/20"
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
                        <span className="text-muted-foreground italic">No supplier</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={platformColors[purchase.platform] || ""}>
                        {purchase.platform.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{purchase.items?.length || 0} items</TableCell>
                    <TableCell className="font-semibold text-sm">
                      AED {Number(purchase.total_estimated_cost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[purchase.status] || ""}>
                        {purchase.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                      {purchase.status !== "reconciled" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deletePurchase.mutate(purchase.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded items */}
                  {expandedRows.has(purchase.id) && (
                    <TableRow key={`${purchase.id}-expanded`} className="bg-muted/10">
                      <TableCell colSpan={8} className="px-8 py-3">
                        {!purchase.items || purchase.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No items in this purchase.</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-1 pr-4">ASIN</th>
                                <th className="text-left py-1 pr-4">SKU</th>
                                <th className="text-left py-1 pr-4">Title</th>
                                <th className="text-left py-1 pr-4">Platform</th>
                                <th className="text-right py-1 pr-4">Qty</th>
                                <th className="text-right py-1 pr-4">Unit Cost</th>
                                <th className="text-right py-1">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchase.items.map((item) => (
                                <tr key={item.id} className="border-b border-muted/30 last:border-0">
                                  <td className="py-1 pr-4 font-mono">{item.asin || "—"}</td>
                                  <td className="py-1 pr-4">{item.sku || "—"}</td>
                                  <td className="py-1 pr-4 max-w-xs truncate">{item.title || "—"}</td>
                                  <td className="py-1 pr-4">
                                    <Badge variant="outline" className={`text-[10px] ${platformColors[item.platform]}`}>
                                      {item.platform}
                                    </Badge>
                                  </td>
                                  <td className="py-1 pr-4 text-right">{item.quantity}</td>
                                  <td className="py-1 pr-4 text-right">{Number(item.unit_cost).toFixed(2)}</td>
                                  <td className="py-1 text-right font-semibold">
                                    {(item.quantity * item.unit_cost).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
