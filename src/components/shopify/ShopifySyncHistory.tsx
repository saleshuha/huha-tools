import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";

interface SyncLog {
  id: string;
  sku: string;
  title: string | null;
  local_quantity: number;
  shopify_quantity: number | null;
  new_quantity: number;
  status: string;
  error_message: string | null;
  synced_at: string;
}

export function ShopifySyncHistory() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("shopify_sync_log" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("synced_at", { ascending: false })
        .limit(200);

      setLogs((data as any[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Sync History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="rounded-md border max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Local Qty</TableHead>
                  <TableHead className="text-right">Shopify Qty</TableHead>
                  <TableHead className="text-right">New Qty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.synced_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.sku}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">
                      {log.title || "—"}
                    </TableCell>
                    <TableCell className="text-right">{log.local_quantity}</TableCell>
                    <TableCell className="text-right">
                      {log.shopify_quantity !== null ? log.shopify_quantity : "—"}
                    </TableCell>
                    <TableCell className="text-right">{log.new_quantity}</TableCell>
                    <TableCell>
                      {log.status === "success" ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Success
                        </Badge>
                      ) : log.status === "skipped" ? (
                        <Badge variant="outline">Skipped</Badge>
                      ) : (
                        <Badge variant="destructive" title={log.error_message || ""}>
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No sync history yet. Sync some items to see the log here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
