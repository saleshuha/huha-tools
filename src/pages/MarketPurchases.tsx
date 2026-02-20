import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, CreditCard, FileText } from "lucide-react";
import { PurchaseLogTab } from "@/components/market-purchases/PurchaseLogTab";
import { CreditBalanceTab } from "@/components/market-purchases/CreditBalanceTab";
import { BillReconciliationTab } from "@/components/market-purchases/BillReconciliationTab";

export default function MarketPurchases() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Market Purchases</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track daily market stock purchases on credit, monitor outstanding balances, and reconcile supplier bills.
        </p>
      </div>

      <Tabs defaultValue="log">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="log" className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4" />
            Purchase Log
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

        <TabsContent value="log" className="mt-6">
          <PurchaseLogTab />
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
