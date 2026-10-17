import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CompactStatBar } from "@/components/ui/compact-stat-bar";
import { ToolbarBar } from "@/components/ui/toolbar-bar";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, RefreshCw, Upload, Package, ShoppingBag, Boxes, Pencil, Plus, Search, History, Link2, Save } from "lucide-react";
import { trendyol } from "./api";

type Inventory = { asin: string; sku: string; title: string; quantity: number };
type Product = { id: string; asin: string; sku: string; barcode: string; title: string; description: string; product_main_id: string; brand_id: number | null; category_id: number | null; sale_price: number; list_price: number; vat_rate: number; images: unknown; attributes: unknown; publish_status: string; enabled: boolean; last_error: string | null };
type PackageRow = { id: string; order_number: string; package_id: string; remote_status: string; fulfilled_at: string | null; last_error: string | null; lines: any };
type Run = { id: string; action: string; status: string; batch_id: string | null; created_at: string; result: unknown };
const number = (value: string) => value ? Number(value) : null;
const empty = { id: "", asin: "", sku: "", barcode: "", title: "", description: "", product_main_id: "", brand_id: null, category_id: null, sale_price: 0, list_price: 0, vat_rate: 15, images: [], attributes: [], publish_status: "draft", enabled: true, last_error: null } satisfies Product;

export function TrendyolWorkspace() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [orders, setOrders] = useState<PackageRow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Product | null>(null);
  const [imageText, setImageText] = useState("");
  const [attributeText, setAttributeText] = useState("[]");
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [catalogResult, setCatalogResult] = useState("");
  const [attributeId, setAttributeId] = useState("");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [shipment, setShipment] = useState<{ order: PackageRow; action: "invoice" | "tracking" } | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [fulfill, setFulfill] = useState<PackageRow | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fetchRows = async (table: "trendyol_products" | "trendyol_packages" | "trendyol_sync_runs") => {
      const all: any[] = []; const seen = new Set<string>();
      for (let start = 0; ; start += 1000) {
        const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).order("id", { ascending: true }).range(start, start + 999);
        if (error) throw error;
        for (const row of data ?? []) if (!seen.has(row.id)) { all.push(row); seen.add(row.id); }
        if ((data?.length ?? 0) < 1000) break;
      }
      return all;
    };
    const [p, o, r] = await Promise.all([fetchRows("trendyol_products"), fetchRows("trendyol_packages"), fetchRows("trendyol_sync_runs")]);
    setProducts(p); setOrders(o); setRuns(r);
  }, []);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Operation failed"); } finally { setBusy(false); }
  };
  const loadInventory = async () => { const result = await trendyol<{ items: Inventory[] }>({ action: "inventory" }); setInventory(result.items); return result.items; };
  const openEditor = (p: Product) => {
    setEdit({ ...p }); setImageText((Array.isArray(p.images) ? p.images : []).map((v: any) => v.url).join("\n"));
    setAttributeText(JSON.stringify(p.attributes, null, 2)); setCatalogResult("");
  };
  const openInventory = async () => {
    const items = await loadInventory();
    const first = items.find(i => i.sku && !products.some(p => p.asin === i.asin));
    if (!first) { toast({ title: "No unmapped Saudi inventory with a SKU" }); return; }
    openEditor({ ...empty, asin: first.asin, sku: first.sku, title: first.title.slice(0, 100), product_main_id: first.asin });
  };
  const save = async () => {
    if (!edit) return;
    const attrs: unknown = JSON.parse(attributeText);
    if (!Array.isArray(attrs)) throw new Error("Attributes must be a JSON array");
    if (!edit.asin.trim() || !edit.sku.trim() || !edit.barcode.trim() || !edit.title.trim()) throw new Error("ASIN, SKU, barcode and title are required");
    if (edit.sale_price < 0 || edit.list_price < edit.sale_price) throw new Error("List price must be at least sale price");
    const images = imageText.split(/\r?\n/).map(url => url.trim()).filter(Boolean).map(url => ({ url }));
    if (images.length > 8 || images.some(i => !i.url.startsWith("https://"))) throw new Error("Use up to 8 HTTPS image URLs");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in required");
    const { id, ...fields } = edit;
    const payload = { ...fields, asin: edit.asin.trim().toUpperCase(), sku: edit.sku.trim().toUpperCase(), barcode: edit.barcode.trim(), images, attributes: attrs, user_id: user.id };
    const result = id ? await supabase.from("trendyol_products").update(payload).eq("id", id) : await supabase.from("trendyol_products").insert(payload);
    if (result.error) throw result.error;
    setEdit(null); toast({ title: "Product mapping saved" });
  };
  const push = async (action: "publish" | "sync", mode?: "stock" | "price" | "both") => {
    const ids = [...selected]; if (!ids.length) throw new Error("Select products first");
    for (let start = 0; start < ids.length; start += 1000) {
      await trendyol({ action, ids: ids.slice(start, start + 1000), ...(mode ? { mode } : {}) });
      if (start + 1000 < ids.length) await new Promise(resolve => setTimeout(resolve, 1100));
    }
    toast({ title: "Submitted to Trendyol", description: "Check the batch results in History; approval is separate." });
  };
  const visible = products.filter(p => `${p.asin} ${p.sku} ${p.title}`.toLowerCase().includes(search.toLowerCase()));
  const balances = new Map(inventory.map(i => [i.asin, i.quantity]));
  const toggle = (id: string) => setSelected(old => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const statusBadge = (status: string) => <Badge variant="outline" className={status === "failed" ? "text-destructive border-destructive/30" : "text-muted-foreground"}>{status}</Badge>;

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div><h2 className="text-xl font-semibold flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Trendyol Saudi Arabia</h2><p className="text-xs text-muted-foreground mt-1">Seller 1360871 · SA · Production · Saudi inventory (KSA) · SAR</p></div>
      <Button disabled={busy} variant="outline" className="h-8 text-xs" onClick={() => run(async () => { await trendyol({ action: "test-connection" }); setConnected(true); await loadInventory(); toast({ title: "Saudi connection verified" }); })}>{connected ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}{connected ? "Connected · Test again" : "Test connection"}</Button>
    </div>
    {error && <div role="alert" className="border border-destructive/30 bg-destructive/10 text-destructive text-xs p-3 rounded-md break-words">{error}</div>}
    <CompactStatBar items={[{ icon: Package, label: "Mapped products", value: products.length }, { icon: Boxes, label: "Sellable units", value: inventory.reduce((sum, i) => sum + i.quantity, 0) }, { icon: ShoppingBag, label: "Awaiting fulfillment", value: orders.filter(o => !o.fulfilled_at && ["Created", "Picking"].includes(o.remote_status)).length }, { icon: History, label: "Pending batches", value: runs.filter(r => r.status === "pending").length }]} />
    <Tabs defaultValue="products">
      <TabsList className="h-8"><TabsTrigger value="products" className="text-xs">Products</TabsTrigger><TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger><TabsTrigger value="history" className="text-xs">History</TabsTrigger></TabsList>
      <TabsContent value="products" className="space-y-3">
        <ToolbarBar>
          <div className="relative flex-1 min-w-40"><Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" /><Input aria-label="Search Trendyol products" placeholder="Search ASIN, SKU or product" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs pl-8" /></div>
          <Button disabled={busy} variant="outline" className="h-8 text-xs" onClick={() => run(loadInventory)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh stock</Button>
          <Button disabled={busy} className="h-8 text-xs" onClick={() => run(openInventory)}><Plus className="h-3.5 w-3.5 mr-1" />Map product</Button>
        </ToolbarBar>
        <div className="flex flex-wrap gap-2 items-center"><span className="text-xs text-muted-foreground">{selected.size} selected</span><Button disabled={busy || !selected.size} variant="outline" className="h-8 text-xs" onClick={() => run(() => push("publish"))}><Upload className="h-3.5 w-3.5 mr-1" />Create products</Button>{(["stock", "price", "both"] as const).map(mode => <Button key={mode} disabled={busy || !selected.size} variant="outline" className="h-8 text-xs" onClick={() => run(() => push("sync", mode))}><RefreshCw className="h-3.5 w-3.5 mr-1" />{mode === "both" ? "Sync price & stock" : `Sync ${mode}`}</Button>)}</div>
        <DataTableWrapper><Table><TableHeader><TableRow><TableHead className="w-10"><Checkbox aria-label="Select all visible Trendyol products" checked={visible.length > 0 && visible.every(p => selected.has(p.id))} onCheckedChange={checked => setSelected(old => { const next = new Set(old); visible.forEach(p => checked ? next.add(p.id) : next.delete(p.id)); return next; })} /></TableHead><TableHead>Product / SKU</TableHead><TableHead>Barcode</TableHead><TableHead>Stock</TableHead><TableHead>Sale price</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {visible.map(p => <TableRow key={p.id}><TableCell><Checkbox aria-label={`Select ${p.sku}`} checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} /></TableCell><TableCell className="max-w-64"><p className="text-xs font-medium break-words">{p.title}</p><p className="text-xs text-muted-foreground break-all">{p.asin} · {p.sku}</p></TableCell><TableCell className="text-xs">{p.barcode}</TableCell><TableCell className="text-xs">{balances.get(p.asin) ?? "—"}</TableCell><TableCell className="text-xs whitespace-nowrap">{Number(p.sale_price).toFixed(2)} SAR</TableCell><TableCell>{statusBadge(p.publish_status)}{p.last_error && <p className="text-xs text-destructive max-w-48 break-words">{p.last_error}</p>}</TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`Edit ${p.sku}`} className="h-8 w-8" onClick={() => openEditor(p)}><Pencil className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
          {!visible.length && <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-10">No Trendyol product mappings</TableCell></TableRow>}
        </TableBody></Table></DataTableWrapper>
      </TabsContent>
      <TabsContent value="orders" className="space-y-3">
        <ToolbarBar><Label htmlFor="trendyol-start" className="text-xs">Orders since</Label><Input id="trendyol-start" type="date" className="h-8 text-xs w-40" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10)} max={new Date().toISOString().slice(0, 10)} /><Button disabled={busy} className="h-8 text-xs" onClick={() => run(async () => {
          let total = 0; let page = 0; let pages = 1;
          while (page < pages) { const result = await trendyol({ action: "import-orders", page, startDate: new Date(`${startDate}T00:00:00Z`).getTime() }); total += result.count; pages = result.totalPages ?? 0; page++; if (page < pages) await new Promise(r => setTimeout(r, 1100)); }
          toast({ title: `${total} order packages imported` });
        })}><RefreshCw className="h-3.5 w-3.5 mr-1" />Import orders</Button></ToolbarBar>
        <DataTableWrapper><Table><TableHeader><TableRow><TableHead>Order / Package</TableHead><TableHead>Items</TableHead><TableHead>Trendyol status</TableHead><TableHead>Local stock</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
          {orders.map(o => <TableRow key={o.id}><TableCell className="text-xs">{o.order_number}<p className="text-muted-foreground">{o.package_id}</p></TableCell><TableCell className="text-xs">{(Array.isArray(o.lines) ? o.lines : []).map((l: any) => <p key={l.id}>{l.merchantSku || l.sku || l.barcode} × {l.quantity}</p>)}</TableCell><TableCell>{statusBadge(o.remote_status)}</TableCell><TableCell className="text-xs">{o.fulfilled_at ? "Deducted" : "Not deducted"}{o.last_error && <p className="text-destructive break-words max-w-48">{o.last_error}</p>}</TableCell><TableCell><div className="flex flex-wrap gap-1">
            <Button disabled={busy || !["Created", "Picking"].includes(o.remote_status)} className="h-8 text-xs" variant="outline" onClick={() => setFulfill(o)}>{o.fulfilled_at ? "Retry Picking" : "Fulfill"}</Button><Button disabled={busy || !o.fulfilled_at || o.remote_status !== "Picking"} className="h-8 text-xs" variant="outline" onClick={() => setShipment({ order: o, action: "invoice" })}>Invoice</Button><Button disabled={busy || !o.fulfilled_at || !["Picking", "Invoiced"].includes(o.remote_status)} className="h-8 text-xs" variant="outline" onClick={() => setShipment({ order: o, action: "tracking" })}>Tracking</Button>
          </div></TableCell></TableRow>)}
          {!orders.length && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-10">No imported Trendyol orders</TableCell></TableRow>}
        </TableBody></Table></DataTableWrapper>
      </TabsContent>
      <TabsContent value="history"><DataTableWrapper><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead><TableHead>Batch</TableHead><TableHead /></TableRow></TableHeader><TableBody>{runs.map(r => <TableRow key={r.id}><TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell><TableCell className="text-xs">{r.action}</TableCell><TableCell>{statusBadge(r.status)}</TableCell><TableCell className="text-xs max-w-48 break-all">{r.batch_id ?? "—"}</TableCell><TableCell><div className="flex gap-1">{r.batch_id && <Button disabled={busy} variant="outline" className="h-8 text-xs" onClick={() => run(async () => { const result = await trendyol({ action: "batch", id: r.id }); setDetails(JSON.stringify(result, null, 2)); })}>Check batch</Button>}<Button variant="ghost" className="h-8 text-xs" onClick={() => setDetails(JSON.stringify(r.result, null, 2))}>Details</Button></div></TableCell></TableRow>)}{!runs.length && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-10">No sync history</TableCell></TableRow>}</TableBody></Table></DataTableWrapper></TabsContent>
    </Tabs>
    <Dialog open={!!edit} onOpenChange={open => { if (!open) setEdit(null); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{edit?.id ? "Edit Trendyol product" : "Map Saudi inventory product"}</DialogTitle></DialogHeader>{edit && <div className="space-y-4">
      {!edit.id && <div><Label className="text-xs" htmlFor="inventory-product">Inventory product</Label><select id="inventory-product" className="w-full h-8 border border-input rounded-md bg-background text-xs px-2" value={edit.asin} onChange={e => { const i = inventory.find(i => i.asin === e.target.value); if (i) setEdit({ ...edit, asin: i.asin, sku: i.sku, title: i.title.slice(0, 100), product_main_id: i.asin }); }}>{inventory.filter(i => i.sku && !products.some(p => p.asin === i.asin)).map(i => <option key={i.asin} value={i.asin}>{i.asin} · {i.sku} · {i.quantity} units</option>)}</select></div>}
      <div className="grid sm:grid-cols-2 gap-3">{(["asin", "sku", "barcode", "product_main_id", "title"] as const).map(field => <div key={field}><Label htmlFor={`ty-${field}`} className="text-xs">{{ asin: "ASIN", sku: "SKU", barcode: "Trendyol barcode", product_main_id: "Model / Main product ID", title: "Title" }[field]}</Label><Input id={`ty-${field}`} className="h-8 text-xs" value={edit[field]} readOnly={field === "asin"} onChange={e => setEdit({ ...edit, [field]: e.target.value })} /></div>)}<div><Label htmlFor="ty-vat" className="text-xs">VAT %</Label><Input id="ty-vat" type="number" min={0} max={100} value={edit.vat_rate} className="h-8 text-xs" onChange={e => setEdit({ ...edit, vat_rate: Number(e.target.value) })} /></div><div><Label htmlFor="ty-sale" className="text-xs">Selling price (SAR)</Label><Input id="ty-sale" type="number" step="0.01" min={0} className="h-8 text-xs" value={edit.sale_price} onChange={e => setEdit({ ...edit, sale_price: Number(e.target.value) })} /></div><div><Label htmlFor="ty-list" className="text-xs">List price (SAR)</Label><Input id="ty-list" type="number" step="0.01" min={0} className="h-8 text-xs" value={edit.list_price} onChange={e => setEdit({ ...edit, list_price: Number(e.target.value) })} /></div></div>
      <div><Label htmlFor="ty-description" className="text-xs">Description</Label><Textarea id="ty-description" value={edit.description} className="text-xs" onChange={e => setEdit({ ...edit, description: e.target.value })} /></div>
      <Button disabled={busy} variant="outline" className="h-8 text-xs" onClick={() => run(async () => {
        const [cat, brand] = await Promise.all([trendyol({ action: "catalog", kind: "categories" }), trendyol({ action: "catalog", kind: "brands" })]);
        const leaves: { id: number; name: string }[] = []; const flatten = (nodes: any[], prefix = "") => nodes.forEach(n => { const name = `${prefix}${n.name}`; if (n.subCategories?.length) flatten(n.subCategories, `${name} / `); else leaves.push({ id: n.id, name }); });
        flatten(cat.categories ?? []); setCategories(leaves); setBrands(brand.brands ?? []);
      })}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Saudi categories & brands</Button>
      <div className="grid sm:grid-cols-2 gap-3"><div><Label htmlFor="ty-category" className="text-xs">Category ID</Label><Input id="ty-category" type="number" className="h-8 text-xs" value={edit.category_id ?? ""} onChange={e => setEdit({ ...edit, category_id: number(e.target.value) })} /><Input aria-label="Search Saudi categories" placeholder="Search categories" className="h-8 text-xs mt-1" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />{categories.length > 0 && <select aria-label="Saudi category" value={edit.category_id ?? ""} className="h-8 w-full border border-input rounded-md bg-background text-xs mt-1" onChange={e => setEdit({ ...edit, category_id: number(e.target.value) })}><option value="">Select category</option>{categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).slice(0, 200).map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}</select>}</div><div><Label htmlFor="ty-brand" className="text-xs">Brand ID</Label><Input id="ty-brand" type="number" className="h-8 text-xs" value={edit.brand_id ?? ""} onChange={e => setEdit({ ...edit, brand_id: number(e.target.value) })} /><Input aria-label="Search Saudi brands" placeholder="Search brands" className="h-8 text-xs mt-1" value={brandSearch} onChange={e => setBrandSearch(e.target.value)} />{brands.length > 0 && <select aria-label="Saudi brand" value={edit.brand_id ?? ""} className="h-8 w-full border border-input rounded-md bg-background text-xs mt-1" onChange={e => setEdit({ ...edit, brand_id: number(e.target.value) })}><option value="">Select brand</option>{brands.filter(c => c.name.toLowerCase().includes(brandSearch.toLowerCase())).slice(0, 200).map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}</select>}</div></div>
      <div className="flex flex-wrap gap-2"><Button disabled={busy || !edit.category_id} variant="outline" className="h-8 text-xs" onClick={() => run(async () => setCatalogResult(JSON.stringify(await trendyol({ action: "catalog", kind: "attributes", categoryId: edit.category_id }), null, 2)))}>Category attributes</Button><Input aria-label="Attribute ID" placeholder="Attribute ID" type="number" className="h-8 text-xs w-32" value={attributeId} onChange={e => setAttributeId(e.target.value)} /><Button disabled={busy || !edit.category_id || !attributeId} variant="outline" className="h-8 text-xs" onClick={() => run(async () => setCatalogResult(JSON.stringify(await trendyol({ action: "catalog", kind: "values", categoryId: edit.category_id, attributeId: Number(attributeId) }), null, 2)))}>Attribute values</Button></div>
      {catalogResult && <pre className="text-xs bg-muted p-3 rounded-md max-h-52 overflow-auto">{catalogResult}</pre>}
      <div><Label htmlFor="ty-attrs" className="text-xs">Category attributes (JSON)</Label><Textarea id="ty-attrs" value={attributeText} onChange={e => setAttributeText(e.target.value)} className="text-xs font-mono" rows={5} /></div>
      <div><Label htmlFor="ty-images" className="text-xs">Image URLs (one HTTPS URL per line, maximum 8)</Label><Textarea id="ty-images" value={imageText} onChange={e => setImageText(e.target.value)} className="text-xs" rows={3} />{imageText.split(/\r?\n/).filter(u => u.trim().startsWith("https://")).slice(0, 8).map((url, i) => <img key={i} src={url.trim()} alt={`Product image ${i + 1}`} className="inline-block w-16 h-20 object-contain border border-border rounded-md mt-2 mr-2" />)}</div>
      <div className="flex gap-2 items-center"><Checkbox id="ty-enabled" checked={edit.enabled} onCheckedChange={checked => setEdit({ ...edit, enabled: checked === true })} /><Label htmlFor="ty-enabled" className="text-xs">Enabled for publishing and fulfillment</Label></div>
    </div>}<DialogFooter><Button disabled={busy} className="h-8 text-xs" onClick={() => run(save)}><Save className="h-3.5 w-3.5 mr-1" />Save mapping</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!fulfill} onOpenChange={open => { if (!open) setFulfill(null); }}><DialogContent><DialogHeader><DialogTitle>Fulfill order {fulfill?.order_number}?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{fulfill?.fulfilled_at ? "Stock is already deducted. Only the Picking notification will be retried." : "Deduct all order quantities from Saudi inventory and mark the package Picking on Trendyol."}</p><DialogFooter><Button variant="outline" onClick={() => setFulfill(null)}>Cancel</Button><Button disabled={busy} onClick={() => run(async () => { if (!fulfill) return; const result = await trendyol({ action: "fulfill", id: fulfill.id }); setFulfill(null); await loadInventory(); toast({ title: result.alreadyFulfilled ? "Already fulfilled · stock unchanged" : "Order fulfilled", description: result.warning ?? "Picking notification completed" }); })}>Confirm fulfillment</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!shipment} onOpenChange={open => { if (!open) setShipment(null); }}><DialogContent><DialogHeader><DialogTitle>{shipment?.action === "invoice" ? "Invoice number" : "Shipping tracking"} · {shipment?.order.order_number}</DialogTitle></DialogHeader>{shipment?.action === "invoice" ? <Input aria-label="Invoice number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /> : <div className="space-y-2"><Input aria-label="Tracking number" placeholder="Tracking number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} /><Input aria-label="Cargo provider code" placeholder="Trendyol cargo provider code" value={providerCode} onChange={e => setProviderCode(e.target.value)} /></div>}<DialogFooter><Button disabled={busy} onClick={() => run(async () => { if (!shipment) return; await trendyol({ action: shipment.action, id: shipment.order.id, ...(shipment.action === "invoice" ? { invoiceNumber } : { trackingNumber, providerCode }) }); setShipment(null); toast({ title: "Trendyol updated" }); })}>Send to Trendyol</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={details !== null} onOpenChange={open => { if (!open) setDetails(null); }}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Trendyol result</DialogTitle></DialogHeader><pre className="text-xs bg-muted rounded-md p-3 max-h-[65vh] overflow-auto">{details}</pre></DialogContent></Dialog>
  </section>;
}