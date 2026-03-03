import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopifySettings } from "@/components/shopify/ShopifySettings";
import { ShopifyInventorySync } from "@/components/shopify/ShopifyInventorySync";
import { ShopifySyncHistory } from "@/components/shopify/ShopifySyncHistory";
import { Store } from "lucide-react";

export default function ShopifySyncPage() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Store className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Shopify Sync</h1>
          <p className="text-sm text-muted-foreground">
            Sync your local inventory quantities with your Shopify store
          </p>
        </div>
      </div>

      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sync">Sync Inventory</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <ShopifyInventorySync />
        </TabsContent>

        <TabsContent value="settings">
          <ShopifySettings />
        </TabsContent>

        <TabsContent value="history">
          <ShopifySyncHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
