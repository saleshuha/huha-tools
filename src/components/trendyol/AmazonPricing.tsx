import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolbarBar } from "@/components/ui/toolbar-bar";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, Save, Send, ChevronLeft, ChevronRight, Square } from "lucide-react";
import { trendyol, TrendyolApiError } from "./api";
import { fetchPriceQueue } from "./price-fetch-queue";
import { calculatedPrices, lookupAsins, pendingLookupAsins, priceSubmissionBlocker, type DualPricingFormula } from "../../../supabase/functions/trendyol/pricing";

type Product = { id: string; asin: string; title: string; sale_price: number; list_price: number; publish_status: string; enabled: boolean };
type PriceRow = { id: string; asin: string; price: number | null; status: string; fetched_at: string; last_error: string | null };
const money = (v: number | null) => v === null ? "—" : `${Number(v).toFixed(2)} SAR`;
export function AmazonPricing({ products, onSubmitted }: { products: Product[]; onSubmitted: () => Promise<void> }) {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [percentage, setPercentage] = useState("0");
  const [fixed, setFixed] = useState("0");
  const [originalPercentage, setOriginalPercentage] = useState("0");
  const [originalFixed, setOriginalFixed] = useState("0");
  const [saved, setSaved] = useState<DualPricingFormula | null>(null);
  const [confirmFetchAll, setConfirmFetchAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [priceView, setPriceView] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [remaining, setRemaining] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [submitIds, setSubmitIds] = useState<string[]>([]);
  const [submitSkipped, setSubmitSkipped] = useState(0);
  const stop = useRef(false);
  useEffect(() => { let active = true; (async () => {
    const rows: PriceRow[] = []; const seen = new Set<string>();
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("trendyol_amazon_prices").select("*").order("id", { ascending: true }).range(start, start + 999);
      if (error) throw error;
      for (const row of data ?? []) if (!seen.has(row.id)) { seen.add(row.id); rows.push(row); }
      if ((data?.length ?? 0) < 1000) break;
    }
    const { data, error } = await supabase.from("trendyol_pricing_settings").select("percentage,fixed_sar,original_percentage,original_fixed_sar").maybeSingle();
    if (error) throw error;
    if (!active) return;
    setPrices(rows); if (data) { setSaved({ percentage: Number(data.percentage), fixed_sar: Number(data.fixed_sar), original_percentage: Number(data.original_percentage), original_fixed_sar: Number(data.original_fixed_sar) }); setPercentage(String(data.percentage)); setFixed(String(data.fixed_sar)); setOriginalPercentage(String(data.original_percentage)); setOriginalFixed(String(data.original_fixed_sar)); } setReady(true);
  })().catch(e => { if (active) setError(e.message); }); return () => { active = false; stop.current = true; }; }, []);
  const formula = { percentage: Number(percentage), fixed_sar: Number(fixed), original_percentage: Number(originalPercentage), original_fixed_sar: Number(originalFixed) };
  const valid = [percentage, fixed, originalPercentage, originalFixed].every(v => v.trim() !== "" && Number.isFinite(Number(v))) && [formula.percentage, formula.original_percentage].every(v => v >= -100 && v <= 1000) && [formula.fixed_sar, formula.original_fixed_sar].every(v => Math.abs(v) <= 10000);
  const dirty = !saved || (Object.keys(formula) as (keyof DualPricingFormula)[]).some(key => saved[key] !== formula[key]);
  const rows = useMemo(() => {
    const byAsin = new Map(prices.map(r => [r.asin, r]));
    return products.map(p => { const cached = byAsin.get(p.asin.trim().toUpperCase()); return { ...p, cached, next: calculatedPrices(cached?.status === "available" ? Number(cached.price) : null, formula) }; });
  }, [products, prices, percentage, fixed, originalPercentage, originalFixed]);
  const pendingAsins = pendingLookupAsins(products, null, prices);
  const selectedPending = pendingLookupAsins(products, selected, prices);
  const filtered = rows.filter(r => (priceView === "all" || (priceView === "blocked" ? priceSubmissionBlocker(r) !== null : priceView === "ready" ? priceSubmissionBlocker(r) === null : priceView === "pending" ? !r.cached : !!r.cached)) && `${r.asin} ${r.title}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 50)); const current = Math.min(page, pages - 1); const visible = filtered.slice(current * 50, current * 50 + 50);
  const picked = rows.filter(r => selected.has(r.id));
  const eligibleRows = rows.filter(r => priceSubmissionBlocker(r) === null);
  const eligiblePicked = picked.filter(r => priceSubmissionBlocker(r) === null);
  const submitting = rows.filter(r => submitIds.includes(r.id));
  const openSubmission = (scope: typeof rows) => {
    const allowed = scope.filter(r => priceSubmissionBlocker(r) === null);
    setSubmitIds(allowed.map(r => r.id)); setSubmitSkipped(scope.length - allowed.length); setConfirm(true);
  };
  const checkApproval = async () => {
    const targets = picked.length ? picked : rows;
    for (let i = 0; i < targets.length; i += 50) {
      setProgress(`Checking approval ${i + 1}–${Math.min(i + 50, targets.length)}/${targets.length}`);
      await trendyol({ action: "approval", ids: targets.slice(i, i + 50).map(r => r.id) });
    }
    await onSubmitted(); setProgress("Approval statuses refreshed");
  };
  const execute = async (fn: () => Promise<void>) => { setBusy(true); setError(""); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Pricing operation failed"); } finally { setBusy(false); } };
  const toggle = (id: string, checked: boolean) => setSelected(s => { const next = new Set(s); checked ? next.add(id) : next.delete(id); return next; });
  const fetchPrices = async (mode: "pending" | "selected" | "all", resume?: string[]) => {
    stop.current = false;
    const asins = resume ?? (mode === "all" ? lookupAsins(products, null) : pendingLookupAsins(products, mode === "selected" ? selected : null, prices));
    if (!asins.length) { setProgress("No pending Amazon prices to fetch"); return; }
    let failures = 0; let firstError = ""; const started = Date.now();
    setRemaining([]);
    const result = await fetchPriceQueue({ asins, stopped: () => stop.current,
      lookup: asin => trendyol<{ item: PriceRow }>({ action: "amazon-price", asin, refresh: mode === "all" }),
      saved: (asin, response) => setPrices(previous => [...previous.filter(r => r.asin !== asin), response.item]),
      failed: (_asin, e) => {
        failures++; firstError ||= e instanceof Error ? e.message : "Price lookup failed";
        if (e instanceof TrendyolApiError && [401, 402, 403, 429, 503].includes(e.status)) stop.current = true;
      },
      progress: (completed, active) => setProgress(`${completed}/${asins.length} checked · ${active} fetching · ${Math.round((Date.now() - started) / 1000)}s`),
    });
    setRemaining(result.remaining);
    setProgress(`${result.saved}/${asins.length} lookups saved${failures ? ` · ${failures} failed` : ""}${stop.current ? " · Stopped" : ""}${result.remaining.length ? ` · ${result.remaining.length} remaining` : ""}`);
    if (firstError) setError(firstError);
  };
  return <div className="space-y-3">
    {error && <p role="alert" className="text-xs text-destructive border border-destructive/30 rounded-md p-3">{error}</p>}
    <ToolbarBar>
      <div><Label htmlFor="amazon-original-percentage" className="text-xs">Original price adjustment %</Label><Input id="amazon-original-percentage" type="number" min={-100} max={1000} step="0.01" disabled={busy || !ready} className="h-8 text-xs w-40" value={originalPercentage} onChange={e => setOriginalPercentage(e.target.value)} /></div>
      <div><Label htmlFor="amazon-original-fixed" className="text-xs">Original price fixed (SAR)</Label><Input id="amazon-original-fixed" type="number" min={-10000} max={10000} step="0.01" disabled={busy || !ready} className="h-8 text-xs w-40" value={originalFixed} onChange={e => setOriginalFixed(e.target.value)} /></div>
      <div><Label htmlFor="amazon-percentage" className="text-xs">Sale price adjustment %</Label><Input id="amazon-percentage" type="number" min={-100} max={1000} step="0.01" disabled={busy || !ready} className="h-8 text-xs w-40" value={percentage} onChange={e => setPercentage(e.target.value)} /></div>
      <div><Label htmlFor="amazon-fixed" className="text-xs">Sale price fixed (SAR)</Label><Input id="amazon-fixed" type="number" min={-10000} max={10000} step="0.01" disabled={busy || !ready} className="h-8 text-xs w-40" value={fixed} onChange={e => setFixed(e.target.value)} /></div>
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !valid || !dirty} onClick={() => execute(async () => {
        const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Sign in required");
        const { error } = await supabase.from("trendyol_pricing_settings").upsert({ user_id: user.id, ...formula }, { onConflict: "user_id" }); if (error) throw error; setSaved(formula); setProgress("Both formulas saved");
      })}><Save className="h-3.5 w-3.5 mr-1" />Save formulas</Button>
      <div className="text-xs text-muted-foreground"><p>Original: Amazon × (1 + {originalPercentage}% / 100) + {originalFixed} SAR</p><p>Sale: Amazon × (1 + {percentage}% / 100) + {fixed} SAR</p></div>
    </ToolbarBar>
    <ToolbarBar>
      <Input aria-label="Search Amazon pricing" placeholder="Search ASIN or product" className="h-8 text-xs max-w-64" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      <Select value={priceView} onValueChange={value => { setPriceView(value); setPage(0); }}><SelectTrigger aria-label="Amazon price status" className="h-8 text-xs w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All items</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="fetched">Fetched</SelectItem><SelectItem value="ready">Ready to submit</SelectItem><SelectItem value="blocked">Blocked</SelectItem></SelectContent></Select>
      <span className="text-xs text-muted-foreground">{selected.size} selected</span>
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !selectedPending.length} onClick={() => execute(() => fetchPrices("selected"))}><RefreshCw className="h-3.5 w-3.5 mr-1" />Fetch selected pending ({selectedPending.length})</Button>
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !pendingAsins.length} onClick={() => execute(() => fetchPrices("pending"))}><RefreshCw className="h-3.5 w-3.5 mr-1" />Fetch pending ({pendingAsins.length})</Button>
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !products.length} onClick={() => setConfirmFetchAll(true)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh all prices</Button>
      {!busy && remaining.length > 0 && <Button variant="outline" className="h-8 text-xs" onClick={() => execute(() => fetchPrices("pending", remaining.filter(asin => pendingAsins.includes(asin))))}><RefreshCw className="h-3.5 w-3.5 mr-1" />Resume pending</Button>}
      {busy && <Button variant="outline" className="h-8 text-xs" onClick={() => { stop.current = true; }}><Square className="h-3.5 w-3.5 mr-1" />Stop after active lookups</Button>}
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !rows.length} onClick={() => execute(checkApproval)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Check approval {picked.length ? "for selected" : "for all"}</Button>
      <Button className="h-8 text-xs" disabled={busy || !ready || !valid || dirty || !eligiblePicked.length} onClick={() => openSubmission(picked)}><Send className="h-3.5 w-3.5 mr-1" />Submit selected prices ({eligiblePicked.length})</Button>
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !valid || dirty || !eligibleRows.length} onClick={() => openSubmission(rows)}><Send className="h-3.5 w-3.5 mr-1" />Push all eligible prices ({eligibleRows.length})</Button>
      {progress && <span role="status" className="text-xs text-muted-foreground">{progress}</span>}
    </ToolbarBar>
    <div role="status" className="text-xs text-muted-foreground space-y-1">
      {dirty && <p>Save formulas before submitting prices.</p>}
      {!valid && <p className="text-destructive">Enter valid original and sale formulas.</p>}
      <p>{eligibleRows.length} ready to submit · {rows.length - eligibleRows.length} blocked · {picked.length - eligiblePicked.length} selected blocked</p>
      {rows.length > eligibleRows.length && <p>Blocked because: {Object.entries(rows.reduce<Record<string, number>>((acc, r) => { const b = priceSubmissionBlocker(r); if (b) acc[b] = (acc[b] ?? 0) + 1; return acc; }, {})).map(([reason, n]) => `${n} ${reason === "Available Amazon price required" ? "no Amazon Buy Box price" : reason}`).join(" · ")}</p>}
      {rows.some(r => r.publish_status !== "approved") && <p>Unapproved products cannot receive price updates. Check approval to refresh their status; products still pending must be approved by Trendyol.</p>}
    </div>
    <DataTableWrapper><Table><TableHeader><TableRow><TableHead className="w-10"><Checkbox aria-label="Select visible pricing products" disabled={busy} checked={visible.length > 0 && visible.every(r => selected.has(r.id))} onCheckedChange={checked => setSelected(s => { const next = new Set(s); visible.forEach(r => checked === true ? next.add(r.id) : next.delete(r.id)); return next; })} /></TableHead><TableHead>Product / ASIN</TableHead><TableHead>Amazon.sa Buy Box</TableHead><TableHead>Last fetched</TableHead><TableHead>Current original / sale</TableHead><TableHead>Preview original</TableHead><TableHead>Preview sale</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
      {visible.map(r => <TableRow key={r.id}><TableCell><Checkbox aria-label={`Select ${r.asin}`} checked={selected.has(r.id)} disabled={busy} onCheckedChange={v => toggle(r.id, v === true)} /></TableCell><TableCell className="text-xs max-w-72"><p className="line-clamp-2">{r.title}</p><a className="text-primary" href={`https://www.amazon.sa/dp/${encodeURIComponent(r.asin)}`} target="_blank" rel="noreferrer">{r.asin}</a></TableCell><TableCell className="text-xs">{money(r.cached?.price ?? null)}</TableCell><TableCell className="text-xs">{r.cached ? new Date(r.cached.fetched_at).toLocaleString() : "—"}</TableCell><TableCell className="text-xs"><p>{money(r.list_price)}</p><p>{money(r.sale_price)}</p></TableCell><TableCell className="text-xs font-medium">{valid ? money(r.next.listPrice) : "Invalid formula"}</TableCell><TableCell className="text-xs font-medium">{valid ? money(r.next.salePrice) : "Invalid formula"}</TableCell><TableCell className="text-xs text-muted-foreground">{r.cached?.last_error ?? r.cached?.status ?? "Not fetched"}{r.next.salePrice !== null && r.next.listPrice !== null && !r.next.valid && <p className="text-destructive">Original below sale</p>}<p>{r.publish_status}</p></TableCell></TableRow>)}
      {!visible.length && <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-10">{ready ? "No mapped products" : "Loading saved prices…"}</TableCell></TableRow>}
    </TableBody></Table></DataTableWrapper>
    <div className="flex items-center justify-end gap-2 text-xs"><span>{filtered.length} products · {current + 1}/{pages}</span><Button size="icon" variant="outline" className="h-8 w-8" aria-label="Previous pricing page" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" className="h-8 w-8" aria-label="Next pricing page" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
    <Dialog open={confirmFetchAll} onOpenChange={setConfirmFetchAll}><DialogContent><DialogHeader><DialogTitle>Refresh all Amazon prices?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Refresh {lookupAsins(products, null).length} unique ASINs, including already fetched products. Each successful lookup uses one ASIN Spotlight credit, even if no product is found.</p><DialogFooter><Button variant="outline" onClick={() => setConfirmFetchAll(false)}>Cancel</Button><Button disabled={busy} onClick={() => { setConfirmFetchAll(false); void execute(() => fetchPrices("all")); }}>Confirm refresh all</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><DialogContent><DialogHeader><DialogTitle>Submit both prices for {submitting.length} products?</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">{submitSkipped} blocked products skipped. Original and sale prices only; stock is unchanged.</p><div className="max-h-72 overflow-auto text-xs space-y-2">{submitting.map(r => <div key={r.id}><p>{r.asin}</p><p>Original: {money(r.list_price)} → {money(r.next.listPrice)}</p><p>Sale: {money(r.sale_price)} → {money(r.next.salePrice)}</p></div>)}</div><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy || !valid || dirty || !submitting.length || submitting.some(r => priceSubmissionBlocker(r) !== null)} onClick={() => execute(async () => {
      let submitted = 0;
      try {
        for (let i = 0; i < submitting.length; i += 100) {
          const batch = submitting.slice(i, i + 100);
          setProgress(`Submitting ${i + 1}–${i + batch.length}/${submitting.length}`);
          await trendyol({ action: "pricing-submit", items: batch.map(r => ({ id: r.id, salePrice: r.next.salePrice, listPrice: r.next.listPrice })) });
          submitted += batch.length;
          const submittedIds = new Set(batch.map(r => r.id));
          setSelected(previous => new Set([...previous].filter(id => !submittedIds.has(id))));
          setSubmitIds(previous => previous.filter(id => !submittedIds.has(id)));
          setProgress(`${submitted}/${submitting.length} products submitted · Check History`);
        }
      } catch (e) {
        setProgress(`${submitted} submitted · ${submitting.length - submitted} not confirmed · Check History before retrying`);
        setConfirm(false);
        if (submitted) await onSubmitted().catch(() => {});
        throw e;
      }
      setConfirm(false); setProgress(`${submitted} prices submitted · ${submitSkipped} skipped · Check History for batch results`); await onSubmitted();
    })}>Confirm submission</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}