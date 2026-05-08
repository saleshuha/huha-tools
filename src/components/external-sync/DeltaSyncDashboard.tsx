import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

interface QueueRow {
  id: string;
  asin: string;
  delta: number;
  status: string;
  balance_after: number | null;
  error_message: string | null;
  created_at: string;
  pushed_at: string | null;
}

export function DeltaSyncDashboard() {
  const { toast } = useToast();
  const [pending, setPending] = useState(0);
  const [recent, setRecent] = useState<QueueRow[]>([]);
  const [pushing, setPushing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [pendingRes, recentRes] = await Promise.all([
      supabase.from("delta_sync_queue" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
      supabase.from("delta_sync_queue" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setPending(pendingRes.count ?? 0);
    setRecent(((recentRes.data ?? []) as any[]) as QueueRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const reconcile = async () => {
    setPushing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(
        `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/delta-sync-push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ mode: "manual" }),
        }
      );
      const result = await res.json();
      const r0 = result.results?.[0];
      if (r0?.error) {
        toast({ title: "Push failed", description: r0.error, variant: "destructive" });
      } else {
        toast({ title: "Push complete", description: `Applied: ${r0?.applied ?? 0}, Skipped: ${r0?.skipped ?? 0}` });
      }
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setPushing(false); }
  };

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30"><CheckCircle className="mr-1 h-3 w-3" />sent</Badge>;
    if (s === "failed") return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30"><XCircle className="mr-1 h-3 w-3" />failed</Badge>;
    if (s === "skipped") return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">skipped</Badge>;
    return <Badge variant="outline" className="bg-muted"><Clock className="mr-1 h-3 w-3" />pending</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Delta Push Queue</CardTitle>
          <CardDescription>Queued ASIN deltas waiting to push to the second app.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={reconcile} disabled={pushing || pending === 0}>
            {pushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Push Now {pending > 0 && `(${pending})`}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-4 text-sm">
          <span><span className="font-medium">{pending}</span> pending</span>
          <span className="text-muted-foreground">·</span>
          <span><span className="font-medium">{recent.filter((r) => r.status === "sent").length}</span> sent (recent)</span>
          <span className="text-muted-foreground">·</span>
          <span><span className="font-medium">{recent.filter((r) => r.status === "failed").length}</span> failed (recent)</span>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            No queued deltas yet. Stock changes will appear here once Delta Sync is configured.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">ASIN</th>
                  <th className="px-2 py-1.5 text-right font-medium">Delta</th>
                  <th className="px-2 py-1.5 text-right font-medium">Balance</th>
                  <th className="px-2 py-1.5 text-left font-medium">Status</th>
                  <th className="px-2 py-1.5 text-left font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-2 py-1.5 font-mono">{r.asin}</td>
                    <td className={`px-2 py-1.5 text-right font-medium ${r.delta < 0 ? "text-red-600" : "text-green-600"}`}>
                      {r.delta > 0 ? `+${r.delta}` : r.delta}
                    </td>
                    <td className="px-2 py-1.5 text-right">{r.balance_after ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      {statusBadge(r.status)}
                      {r.error_message && <div className="mt-0.5 text-[10px] text-red-600">{r.error_message}</div>}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {new Date(r.pushed_at || r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
