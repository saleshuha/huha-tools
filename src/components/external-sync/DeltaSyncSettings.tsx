import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, TestTube, Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

interface Config {
  id: string;
  base_url: string;
  api_key: string | null;
  source_label: string;
  auto_push_enabled: boolean;
  last_pushed_at: string | null;
  last_test_status: string | null;
}

const DEFAULT_BASE = "https://d9498b78-e82e-48be-bd96-a064b66ce3db.lovableproject.com";

export function DeltaSyncSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE);
  const [apiKey, setApiKey] = useState("");
  const [sourceLabel, setSourceLabel] = useState("huha-tools");
  const [autoPush, setAutoPush] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("delta_sync_config" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const d = data as any as Config;
        setConfig(d);
        setBaseUrl(d.base_url || DEFAULT_BASE);
        setApiKey(d.api_key || "");
        setSourceLabel(d.source_label || "huha-tools");
        setAutoPush(d.auto_push_enabled);
      }
    } finally { setLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        base_url: baseUrl.trim(),
        api_key: apiKey.trim() || null,
        source_label: sourceLabel.trim().slice(0, 80) || "huha-tools",
        auto_push_enabled: autoPush,
      };
      const { error } = await supabase
        .from("delta_sync_config" as any)
        .upsert(payload as any, { onConflict: "user_id" });
      if (error) throw error;
      await load();
      toast({ title: "Delta sync settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(
        `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/delta-sync-push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "test" }),
        }
      );
      const result = await res.json();
      setTestResult(result.ok ? "ok" : "fail");
      toast({
        title: result.ok ? "Connection OK" : "Connection failed",
        description: result.ok
          ? "API key is valid."
          : `${result.error || `HTTP ${result.status}`} — ${result.response || ""}`.slice(0, 200),
        variant: result.ok ? "default" : "destructive",
      });
    } catch (e: any) {
      setTestResult("fail");
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally { setTesting(false); }
  };

  if (loading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Delta Stock Sync
        </CardTitle>
        <CardDescription>
          Push ASIN inventory changes (deltas) to a second app via its Bearer-token API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ds-base">Base URL</Label>
            <Input id="ds-base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={DEFAULT_BASE} />
            <p className="text-xs text-muted-foreground">Will POST to <code>{`{base}/api/public/sync/stock`}</code></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-source">Source label</Label>
            <Input id="ds-source" value={sourceLabel} maxLength={80} onChange={(e) => setSourceLabel(e.target.value)} placeholder="my-other-app" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ds-key">API Key</Label>
          <div className="relative">
            <Input
              id="ds-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sp_live_..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {config?.last_test_status && (
            <p className="text-xs text-muted-foreground">Last status: <span className={config.last_test_status === "ok" ? "text-green-600" : "text-red-600"}>{config.last_test_status}</span></p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Auto-Push on stock changes</Label>
            <p className="text-xs text-muted-foreground">
              Every ASIN qty change is queued and pushed every minute.
            </p>
          </div>
          <Switch checked={autoPush} onCheckedChange={setAutoPush} />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          <Button variant="outline" onClick={test} disabled={testing || !apiKey}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : testResult === "ok" ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              : testResult === "fail" ? <XCircle className="mr-2 h-4 w-4 text-red-500" />
              : <TestTube className="mr-2 h-4 w-4" />}
            Test Connection
          </Button>
        </div>

        {config?.last_pushed_at && (
          <p className="text-xs text-muted-foreground">
            Last push: {new Date(config.last_pushed_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
