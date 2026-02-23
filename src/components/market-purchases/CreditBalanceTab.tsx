import { useState, useMemo } from "react";
import { differenceInDays, format } from "date-fns";
import {
  Clock, CreditCard, Users, ChevronRight, DollarSign, TrendingDown,
  Filter, ArrowUpDown, Plus, Trash2, CheckCircle2, ChevronDown
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useMarketPurchaseLinks } from "@/hooks/useMarketPurchaseLinks";
import { useMarketCreditPayments } from "@/hooks/useMarketCreditPayments";
import { toast } from "sonner";

interface SupplierBalance {
  supplier_name: string;
  items_total: number;
  paid_total: number;
  outstanding: number;
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

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Credit Card", "Other"];
const SORT_OPTIONS = [
  { value: "outstanding-desc", label: "Highest Outstanding" },
  { value: "outstanding-asc", label: "Lowest Outstanding" },
  { value: "aging-desc", label: "Oldest First" },
  { value: "aging-asc", label: "Newest First" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
];

export function CreditBalanceTab() {
  const { links, isLoading: linksLoading } = useMarketPurchaseLinks();
  const { payments, isLoading: paymentsLoading, createPayment, deletePayment } = useMarketCreditPayments();

  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recentOpen, setRecentOpen] = useState(true);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [sortBy, setSortBy] = useState("outstanding-desc");
  const [showSettled, setShowSettled] = useState(false);

  const { balances, totalItemsCredit, totalPaid, allSupplierNames } = useMemo(() => {
    const grouped: Record<string, SupplierBalance> = {};

    (links || []).forEach((link) => {
      const items = Array.isArray(link.items) ? link.items : [];
      items.forEach((item: any) => {
        const name = item.supplier_name;
        if (!name) return;
        if (!grouped[name]) {
          grouped[name] = {
            supplier_name: name,
            items_total: 0,
            paid_total: 0,
            outstanding: 0,
            item_count: 0,
            total_qty: 0,
            oldest_date: link.created_at,
            items: [],
          };
        }
        const qty = item.qty || 0;
        const cost = item.unit_cost || 0;
        grouped[name].items_total += qty * cost;
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

    // Aggregate payments per supplier
    (payments || []).forEach((p) => {
      if (grouped[p.supplier_name]) {
        grouped[p.supplier_name].paid_total += Number(p.amount);
      }
    });

    // Compute outstanding
    Object.values(grouped).forEach((b) => {
      b.outstanding = Math.max(0, b.items_total - b.paid_total);
    });

    const allNames = Object.keys(grouped).sort();
    const totalItems = Object.values(grouped).reduce((s, b) => s + b.items_total, 0);
    const totalP = Object.values(grouped).reduce((s, b) => s + b.paid_total, 0);

    return {
      balances: Object.values(grouped),
      totalItemsCredit: totalItems,
      totalPaid: totalP,
      allSupplierNames: allNames,
    };
  }, [links, payments]);

  // Apply filters & sort
  const filteredBalances = useMemo(() => {
    let list = [...balances];
    if (filterSupplier !== "all") {
      list = list.filter((b) => b.supplier_name === filterSupplier);
    }
    if (!showSettled) {
      list = list.filter((b) => b.outstanding > 0);
    }
    const [field, dir] = sortBy.split("-");
    list.sort((a, b) => {
      if (field === "outstanding") return dir === "desc" ? b.outstanding - a.outstanding : a.outstanding - b.outstanding;
      if (field === "aging") {
        const da = new Date(a.oldest_date).getTime();
        const db = new Date(b.oldest_date).getTime();
        return dir === "desc" ? da - db : db - da;
      }
      if (field === "name") return dir === "asc" ? a.supplier_name.localeCompare(b.supplier_name) : b.supplier_name.localeCompare(a.supplier_name);
      return 0;
    });
    return list;
  }, [balances, filterSupplier, sortBy, showSettled]);

  const selectedData = selectedSupplier ? balances.find((b) => b.supplier_name === selectedSupplier) : null;
  const supplierPayments = selectedSupplier ? payments.filter((p) => p.supplier_name === selectedSupplier) : [];
  const recentPayments = payments.slice(0, 10);

  const getAgingInfo = (oldestDate: string) => {
    const days = differenceInDays(new Date(), new Date(oldestDate));
    if (days > 30) return { barColor: "bg-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20", label: `${days}d`, textColor: "text-destructive" };
    if (days > 15) return { barColor: "bg-orange-500", badge: "bg-orange-500/10 text-orange-700 border-orange-200", label: `${days}d`, textColor: "text-orange-600" };
    return { barColor: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200", label: `${days}d`, textColor: "text-emerald-600" };
  };

  const openRecordPayment = (supplierName: string, outstandingAmount?: number) => {
    setPaymentSupplier(supplierName);
    setPaymentAmount(outstandingAmount ? outstandingAmount.toFixed(2) : "");
    setPaymentDate(new Date());
    setPaymentMethod("Cash");
    setPaymentRef("");
    setPaymentNotes("");
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = () => {
    const amt = parseFloat(paymentAmount);
    if (!paymentSupplier || isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    createPayment.mutate({
      supplier_name: paymentSupplier,
      amount: amt,
      payment_date: format(paymentDate, "yyyy-MM-dd"),
      payment_method: paymentMethod,
      reference_number: paymentRef || undefined,
      notes: paymentNotes || undefined,
    }, {
      onSuccess: () => setPaymentDialogOpen(false),
    });
  };

  const isLoading = linksLoading || paymentsLoading;

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
        <p className="text-sm text-muted-foreground mt-1">Balances appear once suppliers are assigned to items via purchase links.</p>
      </div>
    );
  }

  const totalOutstanding = totalItemsCredit - totalPaid;
  const paidPercent = totalItemsCredit > 0 ? Math.min(100, (totalPaid / totalItemsCredit) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Summary Header */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">Outstanding</span>
          <span className="text-sm font-bold text-destructive">AED {totalOutstanding.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Paid</span>
          <span className="text-sm font-bold text-emerald-600">AED {totalPaid.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Total Credit</span>
          <span className="text-sm font-bold text-primary">AED {totalItemsCredit.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 bg-primary/5 px-3 py-1 rounded-lg">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Suppliers</span>
          <span className="text-sm font-bold text-primary">{allSupplierNames.length}</span>
        </div>
        <div className="text-xs text-muted-foreground">{paidPercent.toFixed(0)}% paid</div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-card border border-border">
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {allSupplierNames.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[170px] h-8 text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showSettled ? "secondary" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowSettled(!showSettled)}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {showSettled ? "Hide Settled" : "Show Settled"}
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filteredBalances.length} suppliers</span>
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBalances.map((balance) => {
          const aging = getAgingInfo(balance.oldest_date);
          const pctPaid = balance.items_total > 0 ? Math.min(100, (balance.paid_total / balance.items_total) * 100) : 0;
          const isSettled = balance.outstanding <= 0;

          return (
            <Card
              key={balance.supplier_name}
              className={cn(
                "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border bg-card overflow-hidden group",
                isSettled && "opacity-60"
              )}
            >
              <div className={`h-1 w-full ${isSettled ? "bg-emerald-500" : aging.barColor}`} />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold text-sm text-foreground">{balance.supplier_name}</span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${isSettled ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" : aging.badge}`}>
                    {isSettled ? "Settled" : aging.label}
                  </Badge>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      AED {balance.outstanding.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">outstanding</p>
                  </div>
                  {balance.paid_total > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">
                        AED {balance.paid_total.toLocaleString("en", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">paid</p>
                    </div>
                  )}
                </div>

                <Progress value={pctPaid} className="h-1.5" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className={`h-3 w-3 ${aging.textColor}`} />
                    {format(new Date(balance.oldest_date), "dd MMM yyyy")}
                  </span>
                  <span>{balance.item_count} items · {balance.total_qty} qty</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setSelectedSupplier(balance.supplier_name)}
                  >
                    Details <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                  {!isSettled && (
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRecordPayment(balance.supplier_name, balance.outstanding);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Pay
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredBalances.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No suppliers match your filters.
        </div>
      )}

      {/* Recent Payments Section */}
      {recentPayments.length > 0 && (
        <Collapsible open={recentOpen} onOpenChange={setRecentOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-10 px-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Recent Payments ({recentPayments.length})
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", recentOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border rounded-lg overflow-hidden mt-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Supplier</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Ref</TableHead>
                    <TableHead className="text-xs w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs font-medium">{p.supplier_name}</TableCell>
                      <TableCell className="text-xs text-right font-semibold text-emerald-600">AED {Number(p.amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{p.payment_method}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.reference_number || "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deletePayment.mutate(p.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
              <span>{selectedData?.supplier_name}</span>
              <div className="flex items-center gap-3 text-sm">
                {selectedData && selectedData.paid_total > 0 && (
                  <span className="text-emerald-600 font-semibold">
                    Paid: AED {selectedData.paid_total.toFixed(2)}
                  </span>
                )}
                {selectedData && (
                  <span className="text-destructive font-bold">
                    Due: AED {selectedData.outstanding.toFixed(2)}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedData && !((selectedData.outstanding) <= 0) && (
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => openRecordPayment(selectedData.supplier_name, selectedData.outstanding)}
            >
              <Plus className="h-4 w-4 mr-1" /> Record Payment
            </Button>
          )}

          <Tabs defaultValue="items">
            <TabsList className="w-full">
              <TabsTrigger value="items" className="flex-1">Items ({selectedData?.items.length || 0})</TabsTrigger>
              <TabsTrigger value="payments" className="flex-1">Payments ({supplierPayments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="items">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs text-center">Qty</TableHead>
                      <TableHead className="text-xs text-right">Unit Cost</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs">Link</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedData?.items || []).map((item, idx) => (
                      <TableRow key={idx} className={idx % 2 === 0 ? "" : "bg-muted/10"}>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium truncate max-w-[200px]">{item.title || "—"}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.asin && <span className="font-mono text-[10px] text-muted-foreground">{item.asin}</span>}
                              {item.sku && <span className="text-[10px] text-muted-foreground">· {item.sku}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">{item.qty}</TableCell>
                        <TableCell className="text-right text-sm">AED {item.unit_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">AED {(item.qty * item.unit_cost).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{item.link_title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(item.link_date), "dd MMM")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="payments">
              {supplierPayments.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No payments recorded yet.</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-xs">Reference</TableHead>
                        <TableHead className="text-xs">Notes</TableHead>
                        <TableHead className="text-xs w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-600">AED {Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{p.payment_method}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.reference_number || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{p.notes || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePayment.mutate(p.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Supplier</Label>
              <Input value={paymentSupplier} disabled className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Amount (AED)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="flex-1"
                />
                {selectedData && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => {
                      const b = balances.find((b) => b.supplier_name === paymentSupplier);
                      if (b) setPaymentAmount(b.outstanding.toFixed(2));
                    }}
                  >
                    Pay Full
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !paymentDate && "text-muted-foreground")}>
                    {paymentDate ? format(paymentDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(d) => d && setPaymentDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference Number (optional)</Label>
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="mt-1" placeholder="Receipt / transaction ref" />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="mt-1" rows={2} placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={createPayment.isPending}>
              {createPayment.isPending ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
