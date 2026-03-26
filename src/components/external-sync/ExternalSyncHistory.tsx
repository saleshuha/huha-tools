import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface SyncLog {
  id: string;
  action: string;
  status: string;
  items_count: number;
  error_message: string | null;
  created_at: string;
}

export function ExternalSyncHistory() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("external_sync_log" as any)
        .select("id, action, status, items_count, error_message, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setLogs((data as any) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "partial") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Sync History
          </CardTitle>
          <CardDescription>Recent sync operations</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={loadLogs} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No sync operations yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
              >
                {statusIcon(log.status)}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{log.action}</span>
                  <span className="ml-2 text-muted-foreground">
                    {log.items_count} item{log.items_count !== 1 ? "s" : ""}
                  </span>
                  {log.error_message && (
                    <p className="text-xs text-red-500 truncate">{log.error_message}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
