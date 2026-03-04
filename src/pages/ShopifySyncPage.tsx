import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopifySettings } from "@/components/shopify/ShopifySettings";
import { ShopifyInventorySync } from "@/components/shopify/ShopifyInventorySync";
import { ShopifySyncHistory } from "@/components/shopify/ShopifySyncHistory";
import { ShopifyProductManager } from "@/components/shopify/ShopifyProductManager";
import { ShopifyPushInventory } from "@/components/shopify/ShopifyPushInventory";
import { Store, CheckCircle, XCircle } from "lucide-react";

export default function ShopifySyncPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("shopify_config" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();
      setConfig(data);
    } catch {
      // no config
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);

  const isConnected = config?.store_domain && (config?.client_id || config?.api_token);
  const hasLocation = !!config?.location_id;

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

      {/* Connection Status Banner */}
      {!loading && (
        <div className={`mb-4 flex items-center gap-3 rounded-lg border p-3 ${
          isConnected && hasLocation
            ? "border-green-500/30 bg-green-500/10"
            : "border-red-500/30 bg-red-500/10"
        }`}>
          {isConnected && hasLocation ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Connected to Shopify</p>
                <p className="text-xs text-green-600/80 dark:text-green-400/80">
                  Store: {config.store_domain} · Location: {config.location_id}
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Not connected</p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  {!isConnected ? "Go to Settings to add your Shopify credentials." : "No location selected — test your connection in Settings."}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sync">Sync Inventory</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <ShopifyInventorySync />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <ShopifyProductManager />
          <ShopifyPushInventory />
        </TabsContent>

        <TabsContent value="settings">
          <ShopifySettings onConfigSaved={loadConfig} />
        </TabsContent>

        <TabsContent value="history">
          <ShopifySyncHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
