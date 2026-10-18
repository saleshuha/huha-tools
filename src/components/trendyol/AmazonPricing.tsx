import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToolbarBar } from "@/components/ui/toolbar-bar";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, Save, Send, ChevronLeft, ChevronRight, Square } from "lucide-react";
import { trendyol } from "./api";
import { calculatedPrice } from "../../../supabase/functions/trendyol/pricing";

type Product = { id: string; asin: string; title: string; sale_price: number; publish_status: string; enabled: boolean };
type PriceRow = { id: string; asin: string; price: number | null; status: string; fetched_at: string; last_error: string | null };
const money = (v: number | null) => v === null ? "—" : `${Number(v).toFixed(2)} SAR`;
export function AmazonPricing({ products, onSubmitted }: { products: Product[]; onSubmitted: () => Promise<void> }) {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [percentage, setPercentage] = useState("0");
  const [fixed, setFixed] = useState("0");
  const [saved, setSaved] = useState<{ percentage: number; fixed_sar: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [confirm, setConfirm] = useState(false);
  const stop = useRef(false);
  useEffect(() => { let active = true; (async () => {
    const rows: PriceRow[] = []; const seen = new Set<string>();
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from("trendyol_amazon_prices").select("*").order("id", { ascending: true }).range(start, start + 999);
      if (error) throw error;
      for (const row of data ?? []) if (!seen.has(row.id)) { seen.add(row.id); rows.push(row); }
      if ((data?.length ?? 0) < 1000) break;
    }
    const { data, error } = await supabase.from("trendyol_pricing_settings").select("percentage,fixed_sar").maybeSingle();
    if (error) throw error;
    if (!active) return;
    setPrices(rows); if (data) { setSaved({ percentage: Number(data.percentage), fixed_sar: Number(data.fixed_sar) }); setPercentage(String(data.percentage)); setFixed(String(data.fixed_sar)); } setReady(true);
  })().catch(e => { if (active) setError(e.message); }); return () => { active = false; stop.current = true; }; }, []);
  const formula = { percentage: Number(percentage), fixed_sar: Number(fixed) };
  const valid = percentage.trim() !== "" && fixed.trim() !== "" && Number.isFinite(formula.percentage) && Number.isFinite(formula.fixed_sar) && formula.percentage >= -100 && formula.percentage <= 1000 && Math.abs(formula.fixed_sar) <= 10000;
  const dirty = !saved || saved.percentage !== formula.percentage || saved.fixed_sar !== formula.fixed_sar;
  const rows = useMemo(() => products.map(p => { const cached = prices.find(r => r.asin === p.asin.trim().toUpperCase()); return { ...p, cached, next: calculatedPrice(cached?.status === "available" ? Number(cached.price) : null, formula) }; }), [products, prices, percentage, fixed]);
  const filtered = rows.filter(r => `${r.asin} ${r.title}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 50)); const current = Math.min(page, pages - 1); const visible = filtered.slice(current * 50, current * 50 + 50);
  const picked = rows.filter(r => selected.has(r.id));
  const eligible = picked.length > 0 && picked.every(r => r.next !== null && r.publish_status === "approved" && r.enabled);
  const execute = async (fn: () => Promise<void>) => { setBusy(true); setError(""); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Pricing operation failed"); } finally { setBusy(false); } };
  const toggle = (id: string, checked: boolean) => setSelected(s => { const next = new Set(s); checked ? next.add(id) : next.delete(id); return next; });
  return <div className="space-y-3">
    {error && <p role="alert" className="text-xs text-destructive border border-destructive/30 rounded-md p-3">{error}</p>}
    <ToolbarBar>
      <div><Label htmlFor="amazon-percentage" className="text-xs">Adjustment %</Label><Input id="amazon-percentage" type="number" min={-100} max={1000} step="0.01" disabled={busy || !ready} className="h-8 text-xs w-32" value={percentage} onChange={e => setPercentage(e.target.value)} /></div>
      <div><Label htmlFor="amazon-fixed" className="text-xs">Fixed adjustment (SAR)</Label><Input id="amazon-fixed" type="number" min={-10000} max={10000} step="0.01" disabled={busy || !ready} className="h-8 text-xs w-36" value={fixed} onChange={e => setFixed(e.target.value)} /></div>
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !valid || !dirty} onClick={() => execute(async () => {
        const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Sign in required");
        const { error } = await supabase.from("trendyol_pricing_settings").upsert({ user_id: user.id, ...formula }, { onConflict: "user_id" }); if (error) throw error; setSaved(formula); setProgress("Formula saved");
      })}><Save className="h-3.5 w-3.5 mr-1" />Save formula</Button>
      <span className="text-xs text-muted-foreground">Amazon × (1 + {percentage}% / 100) + {fixed} SAR</span>
    </ToolbarBar>
    <ToolbarBar>
      <Input aria-label="Search Amazon pricing" placeholder="Search ASIN or product" className="h-8 text-xs max-w-64" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      <span className="text-xs text-muted-foreground">{selected.size} selected</span>
      <Button variant="outline" className="h-8 text-xs" disabled={busy || !ready || !selected.size} onClick={() => execute(async () => {
        stop.current = false; const asins = [...new Set(picked.map(r => r.asin.trim().toUpperCase()))]; let count = 0;
        for (const asin of asins) {
          if (stop.current) break;
          setProgress(`Fetching ${count + 1}/${asins.length} · ${asin}`);
          const result = await trendyol<{ item: PriceRow }>({ action: "amazon-price", asin });
          setPrices(previous => [...previous.filter(r => r.asin !== asin), result.item]); count++;
        }
        setProgress(`${count}/${asins.length} lookups saved${stop.current ? " · Stopped" : ""}`);
      })}><RefreshCw className="h-3.5 w-3.5 mr-1" />Fetch Amazon prices</Button>
      {busy && <Button variant="outline" className="h-8 text-xs" onClick={() => { stop.current = true; }}><Square className="h-3.5 w-3.5 mr-1" />Stop after current</Button>}
      <Button className="h-8 text-xs" disabled={busy || !valid || dirty || !eligible} onClick={() => setConfirm(true)}><Send className="h-3.5 w-3.5 mr-1" />Submit preview prices</Button>
      {progress && <span role="status" className="text-xs text-muted-foreground">{progress}</span>}
    </ToolbarBar>
    <DataTableWrapper><Table><TableHeader><TableRow><TableHead className="w-10"><Checkbox aria-label="Select visible pricing products" disabled={busy} checked={visible.length > 0 && visible.every(r => selected.has(r.id))} onCheckedChange={checked => setSelected(s => { const next = new Set(s); visible.forEach(r => checked === true ? next.add(r.id) : next.delete(r.id)); return next; })} /></TableHead><TableHead>Product / ASIN</TableHead><TableHead>Amazon.sa Buy Box</TableHead><TableHead>Last fetched</TableHead><TableHead>Current Trendyol</TableHead><TableHead>Preview price</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
      {visible.map(r => <TableRow key={r.id}><TableCell><Checkbox aria-label={`Select ${r.asin}`} checked={selected.has(r.id)} disabled={busy} onCheckedChange={v => toggle(r.id, v === true)} /></TableCell><TableCell className="text-xs max-w-72"><p className="line-clamp-2">{r.title}</p><a className="text-primary" href={`https://www.amazon.sa/dp/${encodeURIComponent(r.asin)}`} target="_blank" rel="noreferrer">{r.asin}</a></TableCell><TableCell className="text-xs">{money(r.cached?.price ?? null)}</TableCell><TableCell className="text-xs">{r.cached ? new Date(r.cached.fetched_at).toLocaleString() : "—"}</TableCell><TableCell className="text-xs">{money(r.sale_price)}</TableCell><TableCell className="text-xs font-medium">{valid ? money(r.next) : "Invalid formula"}</TableCell><TableCell className="text-xs text-muted-foreground">{r.cached?.last_error ?? r.cached?.status ?? "Not fetched"}<p>{r.publish_status}</p></TableCell></TableRow>)}
      {!visible.length && <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-10">{ready ? "No mapped products" : "Loading saved prices…"}</TableCell></TableRow>}
    </TableBody></Table></DataTableWrapper>
    <div className="flex items-center justify-end gap-2 text-xs"><span>{filtered.length} products · {current + 1}/{pages}</span><Button size="icon" variant="outline" className="h-8 w-8" aria-label="Previous pricing page" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" className="h-8 w-8" aria-label="Next pricing page" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
    <Dialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><DialogContent><DialogHeader><DialogTitle>Submit {picked.length} prices to Trendyol?</DialogTitle></DialogHeader><div className="max-h-72 overflow-auto text-xs space-y-2">{picked.map(r => <p key={r.id}>{r.asin} · {money(r.sale_price)} → {money(r.next)}</p>)}</div><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy || dirty || !eligible} onClick={() => execute(async () => {
      for (let i = 0; i < picked.length; i += 100) {
        setProgress(`Submitting ${i + 1}–${Math.min(i + 100, picked.length)}/${picked.length}`);
        await trendyol({ action: "pricing-submit", items: picked.slice(i, i + 100).map(r => ({ id: r.id, price: r.next })) });
      }
      setConfirm(false); setSelected(new Set()); setProgress("Prices submitted · Check History for batch results"); await onSubmitted();
    })}>Confirm submission</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}