import { useState } from "react";
import { differenceInDays, format } from "date-fns";
import { Clock, TrendingUp, CreditCard, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMarketPurchases } from "@/hooks/useMarketPurchases";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";

export function CreditBalanceTab() {
  const { creditBalances, creditBalancesLoading } = useMarketPurchases();
  const { profile } = useUserProfile();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState("");

  const openPurchasesQuery = useQuery({
    queryKey: ["open_purchases_for_supplier", selectedSupplier, profile?.id],
    queryFn: async () => {
      if (!selectedSupplier || !profile?.id) return [];
      let query = supabase
        .from("market_purchases")
        .select("*, items:market_purchase_items(*)")
        .eq("user_id", profile.id)
        .in("status", ["confirmed", "draft"])
        .order("purchase_date", { ascending: false });

      if (selectedSupplier === "__no_supplier__") {
        query = query.is("supplier_id", null);
      } else {
        query = query.eq("supplier_id", selectedSupplier);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!selectedSupplier && !!profile?.id,
  });

  const getAgingInfo = (oldestDate: string) => {
    const days = differenceInDays(new Date(), new Date(oldestDate));
    if (days > 30) return { barColor: "bg-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20", label: `${days}d — Urgent`, textColor: "text-destructive" };
    if (days > 15) return { barColor: "bg-orange-500", badge: "bg-orange-500/10 text-orange-700 border-orange-200", label: `${days}d — Aging`, textColor: "text-orange-600" };
    return { barColor: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200", label: `${days}d — Recent`, textColor: "text-emerald-600" };
  };

  const totalCredit = creditBalances.reduce((sum, b) => sum + b.total_amount, 0);

  if (creditBalancesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (creditBalances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="font-medium text-foreground">No outstanding credit balances</p>
        <p className="text-sm text-muted-foreground mt-1">All purchases have been reconciled or no purchases have been logged yet.</p>
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
            <span className="text-sm font-medium">{creditBalances.length} suppliers</span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creditBalances.map((balance) => {
          const aging = getAgingInfo(balance.oldest_date);
          return (
            <Card
              key={balance.supplier_id}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border border-border bg-card overflow-hidden group"
              onClick={() => {
                setSelectedSupplier(balance.supplier_id);
                setSupplierName(balance.supplier_name);
              }}
            >
              {/* Top aging color bar */}
              <div className={`h-1 w-full ${aging.barColor}`} />
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="truncate font-semibold">{balance.supplier_name}</span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${aging.badge}`}>
                    {aging.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <p className="text-2xl font-bold text-foreground">
                  AED {balance.total_amount.toLocaleString("en", { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className={`h-3 w-3 ${aging.textColor}`} />
                    Oldest: {format(new Date(balance.oldest_date), "dd MMM yyyy")}
                  </span>
                  <span>{balance.purchase_count} purchase{balance.purchase_count !== 1 ? "s" : ""}</span>
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
            <DialogTitle>Open Purchases — {supplierName}</DialogTitle>
          </DialogHeader>
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Platform</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Items</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Est. Total</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPurchasesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : (openPurchasesQuery.data || []).map((p: any) => {
                  const days = differenceInDays(new Date(), new Date(p.purchase_date));
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{p.platform.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{(p.items || []).length}</TableCell>
                      <TableCell className="font-semibold text-sm">AED {Number(p.total_estimated_cost || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.status}</Badge></TableCell>
                      <TableCell>
                        <span className={days > 30 ? "text-destructive font-semibold" : days > 15 ? "text-orange-600" : "text-emerald-600"}>
                          {days}d ago
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
