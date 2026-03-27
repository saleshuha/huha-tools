import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { Upload, Loader2, CheckCircle, AlertTriangle, RefreshCw, Database, Send, PackageCheck, Clock } from "lucide-react";
import { ExternalSyncHistory } from "./ExternalSyncHistory";

type SyncPhase = "idle" | "authenticating" | "fetching-config" | "loading-inventory" | "aggregating" | "pushing" | "finalizing" | "done" | "error";

const PHASE_CONFIG: Record<SyncPhase, { label: string; detail: string; progress: number }> = {
  idle: { label: "", detail: "", progress: 0 },
  authenticating: { label: "Authenticating", detail: "Verifying your session...", progress: 5 },
  "fetching-config": { label: "Loading Config", detail: "Fetching sync configuration...", progress: 15 },
  "loading-inventory": { label: "Loading Inventory", detail: "Reading inventory data from database...", progress: 30 },
  aggregating: { label: "Aggregating", detail: "Grouping items by ASIN and calculating quantities...", progress: 50 },
  pushing: { label: "Pushing to External App", detail: "Sending product batches to the external app...", progress: 70 },
  finalizing: { label: "Finalizing", detail: "Updating sync timestamps and logging results...", progress: 90 },
  done: { label: "Complete", detail: "Sync finished!", progress: 100 },
  error: { label: "Error", detail: "Something went wrong", progress: 0 },
};

export function ExternalSyncDashboard() {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const [syncing, setSyncing] = useState(false);
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [syncResult, setSyncResult] = useState<{
    status: string;
    successCount: number;
    failCount: number;
    totalItems: number;
  } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    loadLastSync();
  }, []);

  // Elapsed time timer
  useEffect(() => {
    if (!syncing || !startTime) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [syncing, startTime]);

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
    setPhase("authenticating");
    setSyncResult(null);
    setElapsedTime(0);
    setStartTime(Date.now());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      setPhase("fetching-config");
      const { data: configData } = await supabase
        .from("external_sync_config" as any)
        .select("webhook_url")
        .eq("user_id", session.user.id)
        .single();

      const webhookUrl = (configData as any)?.webhook_url ||
        "https://crcrrejwzouyysadrrpv.supabase.co/functions/v1/product-sync";

      setPhase("loading-inventory");
      // Small delay so user sees the phase
      await new Promise((r) => setTimeout(r, 300));

      setPhase("pushing");

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

      setPhase("finalizing");
      const result = await res.json();
      setPhase("done");

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
      setPhase("error");
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
      setSyncResult({ status: "failed", successCount: 0, failCount: 0, totalItems: 0 });
    } finally {
      setSyncing(false);
      setStartTime(null);
    }
  };

  const currentPhase = PHASE_CONFIG[phase];
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const getPhaseIcon = (p: SyncPhase) => {
    switch (p) {
      case "authenticating": return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
      case "fetching-config": return <Database className="h-3.5 w-3.5 text-primary animate-pulse" />;
      case "loading-inventory": return <Database className="h-3.5 w-3.5 text-primary animate-pulse" />;
      case "aggregating": return <PackageCheck className="h-3.5 w-3.5 text-primary animate-pulse" />;
      case "pushing": return <Send className="h-3.5 w-3.5 text-primary animate-pulse" />;
      case "finalizing": return <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />;
      case "done": return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case "error": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default: return null;
    }
  };

  const phases: SyncPhase[] = ["authenticating", "fetching-config", "loading-inventory", "pushing", "finalizing", "done"];

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
            {lastSyncedAt && !syncing && (
              <span className="text-sm text-muted-foreground">
                Last sync: {new Date(lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Detailed sync progress */}
          {(syncing || phase === "done" || phase === "error") && phase !== "idle" && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              {/* Header with phase label + elapsed time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPhaseIcon(phase)}
                  <span className="text-sm font-medium">{currentPhase.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(elapsedTime)}
                </div>
              </div>

              {/* Progress bar */}
              <Progress value={currentPhase.progress} className="h-2" />

              {/* Phase detail text */}
              <p className="text-xs text-muted-foreground">{currentPhase.detail}</p>

              {/* Step indicators */}
              <div className="grid grid-cols-6 gap-1 pt-1">
                {phases.map((p) => {
                  const phaseIdx = phases.indexOf(p);
                  const currentIdx = phases.indexOf(phase);
                  const isCompleted = phase !== "idle" && phase !== "error" && phaseIdx < currentIdx;
                  const isCurrent = p === phase;
                  const isPending = phaseIdx > currentIdx || phase === ("error" as SyncPhase);

                  return (
                    <div key={p} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-1.5 w-full rounded-full transition-colors ${
                          isCompleted
                            ? "bg-green-500"
                            : isCurrent
                            ? "bg-primary animate-pulse"
                            : isPending
                            ? "bg-muted"
                            : "bg-muted"
                        }`}
                      />
                      <span
                        className={`text-[10px] leading-tight text-center ${
                          isCompleted
                            ? "text-green-500 font-medium"
                            : isCurrent
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {PHASE_CONFIG[p].label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Final result card */}
          {syncResult && !syncing && (
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
                  {syncResult.totalItems} total · completed in {formatTime(elapsedTime)}
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
