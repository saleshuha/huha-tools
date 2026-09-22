import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, ChevronDown, ChevronRight, Copy, Link2, KeyRound, ArrowRight } from "lucide-react";

const EXAMPLE_REQUEST = `POST {base}/api/public/sync/stock
Authorization: Bearer sp_live_<KEY>
Content-Type: application/json

{
  "source": "huha-tools",
  "items": [
    { "asin": "B0FH7QHV5N", "delta": -2, "reference_id": "order-123", "notes": "sale" },
    { "asin": "B0XYZ00001", "delta": 10 }
  ]
}`;

const EXAMPLE_RESPONSE = `{
  "applied": 1,
  "skipped": [{ "asin": "B0XYZ00001", "reason": "asin_not_found" }],
  "results": [{ "asin": "B0FH7QHV5N", "delta": -2, "balance_after": 46 }]
}`;

export function ConnectionGuideCard() {
  const { toast } = useToast();
  const [showSpec, setShowSpec] = useState(false);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Connection Guide
        </CardTitle>
        <CardDescription>
          How this app pushes inventory to your other Lovable app — the method, the API the other
          app must implement, and the two things the other app gives you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Method overview */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Method</Badge>
            <span className="text-sm font-medium">HTTPS POST + JSON + Bearer token</span>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Whenever an ASIN's stock changes here, the change is queued and pushed to the other app's
            <code className="mx-1 px-1 py-0.5 rounded bg-muted">/api/public/sync/stock</code>
            endpoint. Only the quantity <strong>delta</strong> (the change) is sent — not the full catalog.
          </div>
          {/* Flow diagram */}
          <pre className="text-[10px] leading-tight overflow-x-auto bg-card border rounded-md p-2 text-muted-foreground">
{`THIS APP (huha-tools)              OTHER LOVABLE APP
─────────────────                 ─────────────────
stock_changes  ──►  delta_sync_queue  ──►  delta-sync-push  ──►  POST /api/public/sync/stock
                    (pending rows)        (Bearer sp_live_…)     receives { source, items }
                                                                applies deltas → returns
                                                                { applied, skipped, results }`}
          </pre>
        </div>

        {/* What the other app provides */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold">What the other app must give you</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3">
              <Link2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Base URL</p>
                <p className="text-xs text-muted-foreground">
                  Their project URL, e.g. <code>https://their-project.lovableproject.com</code>.
                  We POST to <code>{`{base}/api/public/sync/stock`}</code>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3">
              <KeyRound className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">API Key</p>
                <p className="text-xs text-muted-foreground">
                  A <code>sp_live_…</code> Bearer token they generate in their dashboard and hand to
                  you. Paste it in Delta Sync Settings.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <span>Then in Delta Sync Settings:</span>
            <ArrowRight className="h-3 w-3" />
            <span>save Base URL + API Key → Test Connection → enable Auto-Push.</span>
          </div>
        </div>

        {/* API spec collapsible */}
        <div className="rounded-lg border p-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowSpec(!showSpec)}
            className="flex w-full items-center gap-2 text-left"
          >
            {showSpec ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-sm font-semibold">API Specification (give this to the other app)</span>
          </button>

          {showSpec && (
            <div className="space-y-4 pt-1">
              {/* Request */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request</h5>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => copy(EXAMPLE_REQUEST, "Request")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="text-[11px] leading-relaxed overflow-x-auto bg-muted border rounded-md p-3 font-mono">
{EXAMPLE_REQUEST}
                </pre>
                <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                  <li><code>source</code>: ≤ 80 chars, labels the calling app.</li>
                  <li><code>items</code>: 1–500 items per request.</li>
                  <li><code>delta</code>: integer −10000 to +10000. Positive = restock, negative = sale.</li>
                </ul>
              </div>

              {/* Response */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response 200</h5>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => copy(EXAMPLE_RESPONSE, "Response")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="text-[11px] leading-relaxed overflow-x-auto bg-muted border rounded-md p-3 font-mono">
{EXAMPLE_RESPONSE}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Unknown ASINs are skipped (never fail the batch). Each applied row returns the new
                  on-hand stock (<code>balance_after</code>).
                </p>
              </div>

              {/* Errors */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Errors</h5>
                <div className="rounded-md border divide-y text-xs">
                  <div className="flex items-center gap-3 p-2"><code className="text-red-600">401</code> <span className="text-muted-foreground">missing_key / invalid_key — bad or missing Authorization header.</span></div>
                  <div className="flex items-center gap-3 p-2"><code className="text-red-600">403</code> <span className="text-muted-foreground">revoked_key — key revoked in their dashboard.</span></div>
                  <div className="flex items-center gap-3 p-2"><code className="text-amber-600">400</code> <span className="text-muted-foreground">invalid_body — schema validation failed.</span></div>
                  <div className="flex items-center gap-3 p-2"><code className="text-amber-600">429</code> <span className="text-muted-foreground">rate_limited — over 60 requests/min for the same key.</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
