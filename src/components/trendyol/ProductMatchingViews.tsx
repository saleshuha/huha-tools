import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Pencil, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { classifyProducts, productKey, type LocalProduct, type ListedProduct } from "./matching";

type Props<T extends ListedProduct> = {
  products: T[]; inventory: LocalProduct[]; busy: boolean; mappedView: boolean;
  selected: Set<string>; setSelected: (value: Set<string>) => void;
  onEdit: (product: T) => void; onCreate: (item: LocalProduct) => void;
  onMap: (product: T, item: LocalProduct) => void;
};

export function ProductMatchingViews<T extends ListedProduct>({ products, inventory, busy, mappedView, selected, setSelected, onEdit, onCreate, onMap }: Props<T>) {
  const groups = useMemo(() => classifyProducts(products, inventory), [products, inventory]);
  const [view, setView] = useState("matches");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [mapping, setMapping] = useState<T | null>(null);
  const [mappingSearch, setMappingSearch] = useState("");
  const [target, setTarget] = useState("");
  const rows = mappedView ? groups.mapped : view === "matches" ? groups.matches : view === "inventory" ? groups.inventoryOnly.map(inventory => ({ inventory, product: undefined })) : groups.trendyolOnly.map(product => ({ product, inventory: undefined }));
  const filtered = rows.filter(row => `${row.product?.title ?? ""} ${row.product?.sku ?? ""} ${row.product?.barcode ?? ""} ${row.inventory?.title ?? ""} ${row.inventory?.asin ?? ""} ${row.inventory?.sku ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 50, (currentPage + 1) * 50);
  const selectable = visible.flatMap(row => row.product ? [row.product.id] : []);
  const available = inventory.filter(item => !groups.mapped.some(pair => productKey(pair.inventory.asin) === productKey(item.asin)));
  const options = available.filter(item => `${item.asin} ${item.sku} ${item.title}`.toLowerCase().includes(mappingSearch.toLowerCase()));
  return <div className="space-y-3">
    {!mappedView && <Tabs value={view} onValueChange={value => { setView(value); setPage(0); }}><TabsList className="h-auto flex flex-wrap justify-start gap-1"><TabsTrigger className="text-xs" value="matches">Matched · {groups.matches.length}</TabsTrigger><TabsTrigger className="text-xs" value="inventory">Inventory only · {groups.inventoryOnly.length}</TabsTrigger><TabsTrigger className="text-xs" value="trendyol">Trendyol only · {groups.trendyolOnly.length}</TabsTrigger></TabsList></Tabs>}
    <div className="relative max-w-lg"><Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" /><Input aria-label="Search product matching" className="h-8 text-xs pl-8" placeholder="Search ASIN, SKU, barcode or product" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></div>
    <DataTableWrapper><Table><TableHeader><TableRow>
      {mappedView && <TableHead className="w-10"><Checkbox aria-label="Select mapped products on this page" checked={selectable.length > 0 && selectable.every(id => selected.has(id))} onCheckedChange={checked => { const next = new Set(selected); selectable.forEach(id => checked ? next.add(id) : next.delete(id)); setSelected(next); }} /></TableHead>}
      <TableHead>Our inventory / ASIN / SKU</TableHead><TableHead>Trendyol product / SKU / barcode</TableHead><TableHead>Local stock</TableHead><TableHead>Sale price</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
    </TableRow></TableHeader><TableBody>{visible.map(row => <TableRow key={row.product?.id ?? row.inventory?.asin}>
      {mappedView && row.product && <TableCell><Checkbox aria-label={`Select ${row.product.sku}`} checked={selected.has(row.product.id)} onCheckedChange={checked => { const next = new Set(selected); if (row.product) { checked ? next.add(row.product.id) : next.delete(row.product.id); } setSelected(next); }} /></TableCell>}
      <TableCell className="max-w-64 text-xs">{row.inventory ? <><p className="font-medium break-words">{row.inventory.title}</p><p className="text-muted-foreground break-all">{row.inventory.asin} · {row.inventory.sku || "No SKU"}</p></> : <span className="text-muted-foreground">Not mapped</span>}</TableCell>
      <TableCell className="max-w-64 text-xs">{row.product ? <><p className="font-medium break-words">{row.product.title}</p><p className="text-muted-foreground break-all">{row.product.sku} · {row.product.barcode}</p></> : <span className="text-muted-foreground">Not on Trendyol</span>}</TableCell>
      <TableCell className="text-xs">{row.inventory?.quantity ?? "—"}</TableCell><TableCell className="text-xs whitespace-nowrap">{row.product ? `${Number(row.product.sale_price).toFixed(2)} SAR` : "—"}</TableCell>
      <TableCell>{row.product ? <><Badge variant="outline" className="text-xs">{row.product.publish_status}</Badge>{!row.product.enabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}{row.product.last_error && <p className="max-w-48 text-xs text-destructive break-words">{row.product.last_error}</p>}</> : <Badge variant="outline" className="text-xs">Inventory only</Badge>}</TableCell>
      <TableCell><div className="flex flex-wrap gap-1">{mappedView && row.product ? <Button aria-label={`Edit ${row.product.sku}`} title="Edit product and price" variant="ghost" size="icon" className="h-8 w-8" disabled={busy} onClick={() => row.product && onEdit(row.product)}><Pencil className="h-3.5 w-3.5" /></Button> : row.product && row.inventory ? <Button className="h-8 text-xs" disabled={busy} onClick={() => { if (row.product && row.inventory) onMap(row.product, row.inventory); }}><Link2 className="h-3.5 w-3.5 mr-1" />Confirm mapping</Button> : row.product ? <Button className="h-8 text-xs" variant="outline" disabled={busy} onClick={() => { setMapping(row.product ?? null); setMappingSearch(""); setTarget(""); }}><Link2 className="h-3.5 w-3.5 mr-1" />Map inventory</Button> : row.inventory ? <Button className="h-8 text-xs" variant="outline" disabled={busy || !row.inventory.sku} onClick={() => row.inventory && onCreate(row.inventory)}><Plus className="h-3.5 w-3.5 mr-1" />Prepare product</Button> : null}</div></TableCell>
    </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={mappedView ? 7 : 6} className="text-center py-10 text-xs text-muted-foreground">{mappedView ? "No mapped products" : view === "matches" ? "No unconfirmed exact matches" : view === "inventory" ? "No inventory-only products" : "No Trendyol-only products"}</TableCell></TableRow>}</TableBody></Table></DataTableWrapper>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{filtered.length} products · Page {currentPage + 1} of {pages}</span><div className="flex gap-1"><Button aria-label="Previous products page" variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button aria-label="Next products page" variant="outline" size="icon" className="h-8 w-8" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
    <Dialog open={!!mapping} onOpenChange={open => { if (!open) setMapping(null); }}><DialogContent><DialogHeader><DialogTitle>Map Trendyol product</DialogTitle></DialogHeader><p className="text-xs font-medium break-words">{mapping?.title}</p><Input aria-label="Search inventory to map" className="h-8 text-xs" placeholder="Search inventory ASIN, SKU or title" value={mappingSearch} onChange={event => setMappingSearch(event.target.value)} /><div className="max-h-72 overflow-y-auto border border-border rounded-md">{options.map(item => <label key={item.asin} className="flex items-center gap-2 border-b last:border-0 p-3 text-xs cursor-pointer"><input type="radio" name="trendyol-map-target" value={item.asin} checked={target === item.asin} onChange={() => setTarget(item.asin)} /><span className="min-w-0"><span className="block break-words font-medium">{item.title}</span><span className="block text-muted-foreground break-all">{item.asin} · {item.sku} · {item.quantity} units</span></span></label>)}{!options.length && <p className="p-3 text-xs text-muted-foreground">No available inventory products</p>}</div><DialogFooter><Button variant="outline" className="h-8 text-xs" onClick={() => setMapping(null)}>Cancel</Button><Button disabled={busy || !target} className="h-8 text-xs" onClick={() => { const item = available.find(item => item.asin === target); if (mapping && item) { onMap(mapping, item); setMapping(null); } }}><Link2 className="h-3.5 w-3.5 mr-1" />Save mapping</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}