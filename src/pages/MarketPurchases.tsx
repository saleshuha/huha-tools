import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, CreditCard, FileText, CalendarDays, DollarSign } from "lucide-react";
import { PurchaseLogTab } from "@/components/market-purchases/PurchaseLogTab";
import { CreditBalanceTab } from "@/components/market-purchases/CreditBalanceTab";
import { BillReconciliationTab } from "@/components/market-purchases/BillReconciliationTab";
import { DailyOrdersTab } from "@/components/market-purchases/DailyOrdersTab";
import { ItemCostsTab } from "@/components/market-purchases/ItemCostsTab";

export default function MarketPurchases() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Market Purchases</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track daily market stock purchases on credit, monitor outstanding balances, and reconcile supplier bills.
        </p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="daily" className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Daily Orders
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4" />
            Purchase Log
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" />
            Item Costs
          </TabsTrigger>
          <TabsTrigger value="credit" className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            Credit Balances
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Bill Reconciliation
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
