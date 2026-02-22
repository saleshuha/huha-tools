import { useState, useMemo } from "react";
import { differenceInDays, format } from "date-fns";
import { Clock, CreditCard, Users, CheckCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMarketPurchaseLinks } from "@/hooks/useMarketPurchaseLinks";
import { toast } from "sonner";

interface SupplierBalance {
  supplier_name: string;
  total_amount: number;
  item_count: number;
  total_qty: number;
  oldest_date: string;
  items: {
    asin: string | null;
    sku: string | null;
    title: string | null;
    qty: number;
    unit_cost: number;
    link_title: string;
    link_date: string;
    link_id: string;
  }[];
}

export function CreditBalanceTab() {
  const { links, isLoading } = useMarketPurchaseLinks();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const { balances, totalCredit } = useMemo(() => {
    const grouped: Record<string, SupplierBalance> = {};

    (links || []).forEach((link) => {
      const items = Array.isArray(link.items) ? link.items : [];
      items.forEach((item: any) => {
        const name = item.supplier_name;
        if (!name) return;

        if (!grouped[name]) {
          grouped[name] = {
            supplier_name: name,
            total_amount: 0,
            item_count: 0,
            total_qty: 0,
            oldest_date: link.created_at,
            items: [],
          };
        }

        const qty = item.qty || 0;
        const cost = item.unit_cost || 0;
        grouped[name].total_amount += qty * cost;
        grouped[name].item_count += 1;
        grouped[name].total_qty += qty;
        if (link.created_at < grouped[name].oldest_date) {
          grouped[name].oldest_date = link.created_at;
        }
        grouped[name].items.push({
          asin: item.asin || null,
          sku: item.sku || null,
          title: item.title || null,
          qty,
          unit_cost: cost,
          link_title: link.title || "Untitled",
          link_date: link.created_at,
          link_id: link.id,
        });
      });
    });

    const sorted = Object.values(grouped).sort((a, b) => b.total_amount - a.total_amount);
    return {
      balances: sorted,
      totalCredit: sorted.reduce((s, b) => s + b.total_amount, 0),
    };
  }, [links]);

  const selectedData = selectedSupplier ? balances.find((b) => b.supplier_name === selectedSupplier) : null;

  const getAgingInfo = (oldestDate: string) => {
    const days = differenceInDays(new Date(), new Date(oldestDate));
    if (days > 30) return { barColor: "bg-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20", label: `${days}d — Urgent`, textColor: "text-destructive" };
    if (days > 15) return { barColor: "bg-orange-500", badge: "bg-orange-500/10 text-orange-700 border-orange-200", label: `${days}d — Aging`, textColor: "text-orange-600" };
    return { barColor: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200", label: `${days}d — Recent`, textColor: "text-emerald-600" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <CreditCard className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="font-medium text-foreground">No outstanding credit balances</p>
        <p className="text-sm text-muted-foreground mt-1">Balances will appear here once suppliers are assigned to items via purchase links.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Outstanding Credit</p>
              <p className="text-3xl font-bold text-primary">AED {totalCredit.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">{balances.length} suppliers</span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((balance) => {
          const aging = getAgingInfo(balance.oldest_date);
          return (
            <Card
              key={balance.supplier_name}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border border-border bg-card overflow-hidden group"
              onClick={() => setSelectedSupplier(balance.supplier_name)}
            >
              <div className={`h-1 w-full ${aging.barColor}`} />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold text-sm text-foreground">{balance.supplier_name}</span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${aging.badge}`}>
                    {aging.label}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  AED {balance.total_amount.toLocaleString("en", { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className={`h-3 w-3 ${aging.textColor}`} />
                    Oldest: {format(new Date(balance.oldest_date), "dd MMM yyyy")}
                  </span>
                  <span>{balance.item_count} items · {balance.total_qty} qty</span>
                </div>
                <div className="flex items-center justify-end text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ChevronRight className="h-3 w-3 ml-0.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Credit Details — {selectedData?.supplier_name}</span>
              {selectedData && (
                <span className="text-primary font-bold text-lg">
                  AED {selectedData.total_amount.toLocaleString("en", { minimumFractionDigits: 2 })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Product</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-center">Qty</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Unit Cost</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Total</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Link</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selectedData?.items || []).map((item, idx) => (
                  <TableRow key={idx} className={idx % 2 === 0 ? "" : "bg-muted/10"}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{item.title || "—"}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {item.asin && <span className="font-mono text-[10px] text-muted-foreground">{item.asin}</span>}
                          {item.sku && <span className="text-[10px] text-muted-foreground">· {item.sku}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{item.qty}</TableCell>
                    <TableCell className="text-right text-sm">AED {item.unit_cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-primary">
                      AED {(item.qty * item.unit_cost).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{item.link_title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(item.link_date), "dd MMM")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
