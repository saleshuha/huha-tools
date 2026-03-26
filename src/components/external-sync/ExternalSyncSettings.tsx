import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";

interface SyncConfig {
  id: string;
  webhook_url: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
}

export function ExternalSyncSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(
    "https://crcrrejwzouyysadrrpv.supabase.co/functions/v1/product-sync"
  );
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("external_sync_config" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const d = data as any;
        setConfig(d);
        setWebhookUrl(d.webhook_url);
        setSyncEnabled(d.sync_enabled);
      }
    } catch {
      // no config yet
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (config) {
        await supabase
          .from("external_sync_config" as any)
          .update({
            webhook_url: webhookUrl,
            sync_enabled: syncEnabled,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", config.id);
      } else {
        await supabase.from("external_sync_config" as any).insert({
          user_id: user.id,
          webhook_url: webhookUrl,
          sync_enabled: syncEnabled,
        } as any);
      }
      await loadConfig();
      toast({ title: "Settings saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/external-app-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "test-connection", webhookUrl }),
        }
      );
      const result = await res.json();
      setTestResult(result.success ? "success" : "failed");
      toast({
        title: result.success ? "Connection successful!" : "Connection failed",
        description: result.success
          ? "The external app responded successfully."
          : `Error: ${JSON.stringify(result.data || result.error)}`,
        variant: result.success ? "default" : "destructive",
      });
    } catch (err: any) {
      setTestResult("failed");
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          External App Connection
        </CardTitle>
        <CardDescription>
          Configure the webhook URL to sync inventory with your other Lovable app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-project.supabase.co/functions/v1/product-sync"
          />
          <p className="text-xs text-muted-foreground">
            The product-sync endpoint of your other Lovable app.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Auto-Sync on Changes</Label>
            <p className="text-xs text-muted-foreground">
              Automatically push inventory changes to the external app.
            </p>
          </div>
          <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={saveConfig} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : testResult === "success" ? (
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            ) : testResult === "failed" ? (
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
        </div>

        {config?.last_synced_at && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(config.last_synced_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
