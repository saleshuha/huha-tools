import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { Upload, Loader2, CheckCircle, AlertTriangle, RefreshCw, Database, Send, PackageCheck, Clock, XCircle, Pause, Play, Square, Image } from "lucide-react";
import { ExternalSyncHistory } from "./ExternalSyncHistory";

interface AggregatedProduct {
  asin: string;
  sku: string;
  title: string;
  quantity: number;
  images: string[];
}

export function ExternalSyncDashboard() {
  const { toast } = useToast();
  const { selectedCountry } = useCountry();
  const [syncing, setSyncing] = useState(false);
  const [phase, setPhase] = useState<string>("idle");
  const [phaseDetail, setPhaseDetail] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentItem, setCurrentItem] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const [syncDone, setSyncDone] = useState(false);
  const [failedItems, setFailedItems] = useState<string[]>([]);
  const [imagesFound, setImagesFound] = useState(0);

  // Pause/Stop refs (use refs so the loop sees latest value)
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  useEffect(() => {
    loadLastSync();
  }, []);

  // Elapsed time timer (pauses when paused)
  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(() => {
      if (startTimeRef.current && !pausedRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [syncing]);

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

  const handlePause = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
  }, []);

  const handleStop = useCallback(() => {
    stoppedRef.current = true;
    setIsStopped(true);
    pausedRef.current = false;
    setIsPaused(false);
  }, []);

  // Wait while paused
  const waitIfPaused = async () => {
    while (pausedRef.current && !stoppedRef.current) {
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const pushAllInventory = async () => {
    setSyncing(true);
    setSyncDone(false);
    setPhase("loading");
    setPhaseDetail("Loading inventory from database...");
    setProgressPercent(0);
    setCurrentItem(0);
    setTotalItems(0);
    setSuccessCount(0);
    setFailCount(0);
    setElapsedTime(0);
    setFailedItems([]);
    setImagesFound(0);
    pausedRef.current = false;
    stoppedRef.current = false;
    setIsPaused(false);
    setIsStopped(false);
    startTimeRef.current = Date.now();

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

      // Load all inventory items client-side
      setPhaseDetail("Fetching inventory items...");
      const country = selectedCountry || "KSA";
      let allItems: any[] = [];
      let from = 0;
      const chunkSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("asin_inventory")
          .select("asin, sku, title, quantity, status")
          .eq("user_id", session.user.id)
          .eq("country", country)
          .or("is_active.is.null,is_active.eq.true")
          .range(from, from + chunkSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allItems = allItems.concat(data);
        if (data.length < chunkSize) break;
        from += chunkSize;
      }

      // Aggregate by ASIN
      setPhase("aggregating");
      setPhaseDetail(`Aggregating ${allItems.length} inventory rows by ASIN...`);
      setProgressPercent(5);

      const asinMap = new Map<string, AggregatedProduct>();
      for (const item of allItems) {
        const existing = asinMap.get(item.asin);
        if (existing) {
          existing.quantity += item.quantity || 0;
        } else {
          asinMap.set(item.asin, {
            asin: item.asin,
            sku: item.sku || item.asin,
            title: item.title || item.asin,
            quantity: item.quantity || 0,
            images: [],
          });
        }
      }

      // Fetch product images for all ASINs
      setPhase("loading-images");
      setPhaseDetail("Loading product images...");
      setProgressPercent(8);

      const allAsins = Array.from(asinMap.keys());
      let totalImagesFound = 0;

      // Fetch images in chunks of 50 ASINs
      for (let i = 0; i < allAsins.length; i += 50) {
        const chunk = allAsins.slice(i, i + 50);
        const { data: imgData } = await (supabase as any)
          .from("product_images")
          .select("asin, image_url")
          .eq("user_id", session.user.id)
          .in("asin", chunk);

        if (imgData) {
          for (const img of imgData) {
            const product = asinMap.get(img.asin);
            if (product && img.image_url) {
              product.images.push(img.image_url);
              totalImagesFound++;
            }
          }
        }
      }

      setImagesFound(totalImagesFound);
      setPhaseDetail(`Found ${totalImagesFound} images for ${allAsins.length} products`);

      const products = Array.from(asinMap.values());
      setTotalItems(products.length);
      setPhase("pushing");
      setPhaseDetail(`Pushing ${products.length} products one by one...`);
      setProgressPercent(15);

      // Push each product one-by-one via the edge function
      let succeeded = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < products.length; i++) {
        // Check stop
        if (stoppedRef.current) {
          setPhaseDetail(`Stopped by user at ${i}/${products.length}`);
          break;
        }

        // Wait if paused
        await waitIfPaused();
        if (stoppedRef.current) {
          setPhaseDetail(`Stopped by user at ${i}/${products.length}`);
          break;
        }

        const p = products[i];
        setCurrentItem(i + 1);
        setPhaseDetail(`Syncing ${i + 1}/${products.length}: ${p.title?.substring(0, 40) || p.asin}...`);
        setProgressPercent(15 + Math.round((i / products.length) * 80));

        try {
          const res = await fetch(
            `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/external-app-sync`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                action: "upsert-product",
                webhookUrl,
                product: {
                  name: p.title || p.asin,
                  asin: p.asin,
                  sku: p.sku || p.asin,
                  quantity: p.quantity,
                  images: p.images.length > 0 ? p.images : undefined,
                },
              }),
            }
          );

          const result = await res.json();
          if (result.success) {
            succeeded++;
          } else {
            failed++;
            errors.push(`${p.asin}: ${JSON.stringify(result.data?.error || result.error || "Unknown error")}`);
          }
        } catch (err: any) {
          failed++;
          errors.push(`${p.asin}: ${err.message}`);
        }

        setSuccessCount(succeeded);
        setFailCount(failed);
      }

      setFailedItems(errors);

      // Update last_synced_at
      if (succeeded > 0) {
        setPhase("finalizing");
        setPhaseDetail("Updating sync timestamp...");
        setProgressPercent(97);

        await supabase
          .from("external_sync_config" as any)
          .update({
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq("user_id", session.user.id);

        await loadLastSync();
      }

      setProgressPercent(100);
      setPhase("done");
      const stoppedEarly = stoppedRef.current;
      setPhaseDetail(
        stoppedEarly
          ? `Stopped: ${succeeded} succeeded, ${failed} failed (${products.length - succeeded - failed} skipped)`
          : failed === 0
            ? `All ${succeeded} products synced successfully!`
            : `${succeeded} succeeded, ${failed} failed`
      );

      toast({
        title: stoppedEarly ? "Sync stopped" : failed === 0 ? "Sync complete!" : "Sync completed with errors",
        description: `${succeeded} products synced, ${failed} failed`,
        variant: failed === 0 && !stoppedEarly ? "default" : "destructive",
      });
    } catch (err: any) {
      setPhase("error");
      setPhaseDetail(err.message);
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      setSyncDone(true);
      startTimeRef.current = null;
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const getPhaseIcon = () => {
    switch (phase) {
      case "loading": return <Database className="h-4 w-4 animate-pulse text-primary" />;
      case "loading-images": return <Image className="h-4 w-4 animate-pulse text-primary" />;
      case "aggregating": return <PackageCheck className="h-4 w-4 animate-pulse text-primary" />;
      case "pushing": return <Send className="h-4 w-4 animate-pulse text-primary" />;
      case "finalizing": return <Clock className="h-4 w-4 animate-pulse text-primary" />;
      case "done": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
  };

  const showProgress = syncing || syncDone;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Push Inventory
          </CardTitle>
          <CardDescription>
            Push all active {selectedCountry || "KSA"} inventory (with images) to the external app.
            Each product is synced individually for reliability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {!syncing && (
              <Button onClick={pushAllInventory} disabled={syncing} size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Push All Inventory
              </Button>
            )}

            {/* Pause / Resume / Stop controls */}
            {syncing && (
              <div className="flex items-center gap-2">
                {!isPaused ? (
                  <Button variant="outline" size="sm" onClick={handlePause}>
                    <Pause className="mr-1.5 h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleResume} className="border-green-500/50 text-green-500 hover:bg-green-500/10">
                    <Play className="mr-1.5 h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleStop}>
                  <Square className="mr-1.5 h-4 w-4" />
                  Stop
                </Button>
              </div>
            )}

            {lastSyncedAt && !syncing && (
              <span className="text-sm text-muted-foreground">
                Last sync: {new Date(lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Detailed progress panel */}
          {showProgress && phase !== "idle" && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getPhaseIcon()}
                  <span className="text-sm font-medium capitalize">
                    {phase === "done" ? "Complete" : phase === "error" ? "Error" : phase === "loading-images" ? "Loading Images" : phase.replace("-", " ")}
                  </span>
                  {isPaused && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-medium">
                      PAUSED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {totalItems > 0 && (
                    <span>{currentItem} / {totalItems} products</span>
                  )}
                  {imagesFound > 0 && (
                    <span className="flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      {imagesFound} images
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(elapsedTime)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <Progress value={progressPercent} className="h-2.5" />

              {/* Detail text */}
              <p className="text-xs text-muted-foreground">{phaseDetail}</p>

              {/* Live counters */}
              {(phase === "pushing" || phase === "done" || phase === "error") && totalItems > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded-md border border-green-500/20 bg-green-500/5 p-2 text-center">
                    <p className="text-lg font-bold text-green-500">{successCount}</p>
                    <p className="text-[10px] text-muted-foreground">Succeeded</p>
                  </div>
                  <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2 text-center">
                    <p className="text-lg font-bold text-red-500">{failCount}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{totalItems}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                </div>
              )}

              {/* Failed items list */}
              {failedItems.length > 0 && !syncing && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded border border-red-500/20 bg-red-500/5 p-2">
                  <p className="text-xs font-medium text-red-400 mb-1">Failed items:</p>
                  {failedItems.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground truncate">{err}</p>
                  ))}
                  {failedItems.length > 20 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ...and {failedItems.length - 20} more
                    </p>
                  )}
                </div>
              )}

              {/* Final summary */}
              {phase === "done" && !syncing && (
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  Completed in {formatTime(elapsedTime)} · {successCount} synced · {failCount} failed · {imagesFound} images sent
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ExternalSyncHistory />
    </div>
  );
}
