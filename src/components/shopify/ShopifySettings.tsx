import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Store } from "lucide-react";

interface ShopifySettingsProps {
  onConfigSaved?: () => void;
}

export function ShopifySettings({ onConfigSaved }: ShopifySettingsProps) {
  const [storeDomain, setStoreDomain] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [shopName, setShopName] = useState("");
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [existingConfig, setExistingConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("shopify_config" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const config = data as any;
        setStoreDomain(config.store_domain || "");
        setApiToken(config.api_token || "");
        setLocationId(config.location_id || "");
        setSyncEnabled(config.sync_enabled || false);
        setExistingConfig(true);
      }
    } catch {
      // No config yet
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!storeDomain || !apiToken) {
      toast.error("Please enter store domain and API token first");
      return;
    }
    setTesting(true);
    setConnectionStatus("idle");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save config first so edge function can read it
      await saveConfig(false);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/shopify-sync?action=test-connection`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await res.json();
      if (result.success) {
        setConnectionStatus("success");
        setShopName(result.shop?.name || "");
        if (result.locations?.length > 0) {
          setLocations(
            result.locations.map((l: any) => ({ id: String(l.id), name: l.name }))
          );
          if (!locationId && result.locations.length > 0) {
            setLocationId(String(result.locations[0].id));
          }
        }
        toast.success(`Connected to ${result.shop?.name || storeDomain}`);
      } else {
        setConnectionStatus("error");
        toast.error(result.error || "Connection failed");
      }
    } catch (e: any) {
      setConnectionStatus("error");
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async (showToast = true) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const domain = storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const configData = {
        user_id: user.id,
        store_domain: domain,
        api_token: apiToken,
        location_id: locationId || null,
        sync_enabled: syncEnabled,
      };

      if (existingConfig) {
        const { error } = await supabase
          .from("shopify_config" as any)
          .update(configData)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shopify_config" as any)
          .insert(configData);
        if (error) throw error;
        setExistingConfig(true);
      }

      if (showToast) {
        toast.success("Shopify settings saved");
        onConfigSaved?.();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Shopify Store Connection
          </CardTitle>
          <CardDescription>
            Connect your Shopify store to sync inventory automatically. Create an Admin API access
            token in Shopify Admin → Settings → Apps → Develop apps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-domain">Store Domain</Label>
            <Input
              id="store-domain"
              placeholder="mystore.myshopify.com"
              value={storeDomain}
              onChange={(e) => setStoreDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Shopify store URL (e.g., mystore.myshopify.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-token">Admin API Access Token</Label>
            <Input
              id="api-token"
              type="password"
              placeholder="shpat_xxxxx..."
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Found in Shopify Admin → Settings → Apps → Develop apps → Your app → API credentials
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={testConnection} disabled={testing} variant="outline">
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : connectionStatus === "success" ? (
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              ) : connectionStatus === "error" ? (
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
              ) : null}
              Test Connection
            </Button>
            {shopName && (
              <span className="text-sm text-muted-foreground">
                Connected to: <strong>{shopName}</strong>
              </span>
            )}
          </div>

          {locations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="location">Inventory Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The Shopify location where inventory will be updated
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-sm font-medium">Auto-Sync</Label>
              <p className="text-xs text-muted-foreground">
                Automatically sync inventory when stock changes (coming soon)
              </p>
            </div>
            <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
          </div>

          <Button onClick={() => saveConfig(true)} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
