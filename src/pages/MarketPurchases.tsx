import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, CreditCard, FileText, CalendarDays, DollarSign, TrendingUp, Package, Receipt } from "lucide-react";
import { PurchaseLogTab } from "@/components/market-purchases/PurchaseLogTab";
import { CreditBalanceTab } from "@/components/market-purchases/CreditBalanceTab";
import { BillReconciliationTab } from "@/components/market-purchases/BillReconciliationTab";
import { DailyOrdersTab } from "@/components/market-purchases/DailyOrdersTab";
import { ItemCostsTab } from "@/components/market-purchases/ItemCostsTab";

export default function MarketPurchases() {
  return (
    <div className="p-6 space-y-6">
      {/* Gradient Hero Header */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-sky/10 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex items-start gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Market Purchases</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track daily market stock purchases on credit, monitor outstanding balances, and reconcile supplier bills.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="daily" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Orders</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Purchase Log</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Item Costs</span>
          </TabsTrigger>
          <TabsTrigger value="credit" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Credit Balances</span>
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Bill Reconciliation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-6">
          <DailyOrdersTab />
        </TabsContent>

        <TabsContent value="log" className="mt-6">
          <PurchaseLogTab />
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <ItemCostsTab />
        </TabsContent>

        <TabsContent value="credit" className="mt-6">
          <CreditBalanceTab />
        </TabsContent>

        <TabsContent value="bills" className="mt-6">
          <BillReconciliationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
