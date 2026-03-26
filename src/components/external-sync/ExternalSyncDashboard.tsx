import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { Upload, Loader2, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { ExternalSyncHistory } from "./ExternalSyncHistory";

export function ExternalSyncDashboard() {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<{
    status: string;
    successCount: number;
    failCount: number;
    totalItems: number;
  } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    loadLastSync();
  }, []);

  const loadLastSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("external_sync_config" as any)
        .select("last_synced_at, webhook_url")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setLastSyncedAt((data as any).last_synced_at);
      }
    } catch {
      // ignore
    }
  };

  const pushAllInventory = async () => {
    setSyncing(true);
    setProgress(10);
    setSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get webhook URL from config
      const { data: configData } = await supabase
        .from("external_sync_config" as any)
        .select("webhook_url")
        .eq("user_id", session.user.id)
        .single();

      const webhookUrl = (configData as any)?.webhook_url ||
        "https://crcrrejwzouyysadrrpv.supabase.co/functions/v1/product-sync";

      setProgress(30);

      const res = await fetch(
        `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/external-app-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "sync-inventory",
            webhookUrl,
            country: selectedCountry || "KSA",
          }),
        }
      );

      setProgress(90);
      const result = await res.json();
      setProgress(100);

      setSyncResult({
        status: result.status || (result.success ? "success" : "failed"),
        successCount: result.successCount || 0,
        failCount: result.failCount || 0,
        totalItems: result.totalItems || 0,
      });

      if (result.success) {
        toast({ title: "Sync complete", description: `${result.successCount} items pushed successfully.` });
        await loadLastSync();
      } else {
        toast({
          title: "Sync had issues",
          description: `${result.failCount} items failed. Check logs for details.`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
      setSyncResult({ status: "failed", successCount: 0, failCount: 0, totalItems: 0 });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Push Inventory
          </CardTitle>
          <CardDescription>
            Push all active {selectedCountry || "KSA"} inventory to the external app. Items are
            aggregated by ASIN and sent in batches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={pushAllInventory} disabled={syncing} size="lg">
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {syncing ? "Syncing..." : "Push All Inventory"}
            </Button>
            {lastSyncedAt && (
              <span className="text-sm text-muted-foreground">
                Last sync: {new Date(lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>

          {syncing && <Progress value={progress} className="h-2" />}

          {syncResult && (
            <div
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                syncResult.status === "success"
                  ? "border-green-500/30 bg-green-500/10"
                  : syncResult.status === "partial"
                  ? "border-yellow-500/30 bg-yellow-500/10"
                  : "border-red-500/30 bg-red-500/10"
              }`}
            >
              {syncResult.status === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {syncResult.status === "success"
                    ? "All items synced!"
                    : syncResult.status === "partial"
                    ? "Partial sync"
                    : "Sync failed"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {syncResult.successCount} succeeded · {syncResult.failCount} failed ·{" "}
                  {syncResult.totalItems} total
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ExternalSyncHistory />
    </div>
  );
}
