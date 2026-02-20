import { useState } from "react";
import { differenceInDays, format } from "date-fns";
import { AlertTriangle, Clock, TrendingUp } from "lucide-react";
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

  const getAgingClass = (oldestDate: string) => {
    const days = differenceInDays(new Date(), new Date(oldestDate));
    if (days > 30) return { bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-800 border-red-200", label: `${days}d — Urgent`, icon: "text-red-500" };
    if (days > 15) return { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800 border-amber-200", label: `${days}d — Aging`, icon: "text-amber-500" };
    return { bg: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-800 border-green-200", label: `${days}d — Recent`, icon: "text-green-500" };
  };

  const totalCredit = creditBalances.reduce((sum, b) => sum + b.total_amount, 0);

  if (creditBalancesLoading) {
    return (
      <div className="text-center py-16 text-muted-foreground">Loading credit balances...</div>
    );
  }

  if (creditBalances.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No outstanding credit balances</p>
        <p className="text-sm">All purchases have been reconciled or no purchases have been logged yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="rounded-xl border bg-primary/5 border-primary/20 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total Outstanding Credit</p>
          <p className="text-3xl font-bold text-primary">AED {totalCredit.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{creditBalances.length} suppliers with open credit</p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creditBalances.map((balance) => {
          const aging = getAgingClass(balance.oldest_date);
          return (
            <Card
              key={balance.supplier_id}
              className={`cursor-pointer transition-all hover:shadow-md border ${aging.bg}`}
              onClick={() => {
                setSelectedSupplier(balance.supplier_id);
                setSupplierName(balance.supplier_name);
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="truncate">{balance.supplier_name}</span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${aging.badge}`}>
                    {aging.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">
                  AED {balance.total_amount.toLocaleString("en", { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className={`h-3 w-3 ${aging.icon}`} />
                    Oldest: {format(new Date(balance.oldest_date), "dd MMM yyyy")}
                  </span>
                  <span>{balance.purchase_count} purchase{balance.purchase_count !== 1 ? "s" : ""}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Open Purchases — {supplierName}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Date</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Est. Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age</TableHead>
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
                    <TableCell>{format(new Date(p.purchase_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.platform.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{(p.items || []).length}</TableCell>
                    <TableCell className="font-semibold">AED {Number(p.total_estimated_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={days > 30 ? "text-red-600 font-semibold" : days > 15 ? "text-amber-600" : "text-green-600"}>
                        {days}d ago
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
