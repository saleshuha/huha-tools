import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Search, Package, RefreshCw, Tag } from "lucide-react";

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  tags: string;
  variants: {
    id: number;
    title: string;
    sku: string;
    price: string;
    inventory_quantity: number;
  }[];
  images: { src: string }[];
}

interface ProductFormData {
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  sku: string;
  price: string;
  image_url: string;
}

const emptyForm: ProductFormData = {
  title: "",
  body_html: "",
  vendor: "",
  product_type: "",
  tags: "",
  sku: "",
  price: "",
  image_url: "",
};

export function ShopifyProductManager() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ShopifyProduct | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tagging, setTagging] = useState(false);

  const callEdge = async (action: string, body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(
      `https://vfqqlifvhooefxvvyebm.supabase.co/functions/v1/shopify-sync?action=${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await callEdge("fetch-products-full", {});
      setProducts(data.products || []);
    } catch (e: any) {
      toast({ title: "Error loading products", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const handleCreate = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        body_html: form.body_html || undefined,
        vendor: form.vendor || undefined,
        product_type: form.product_type || undefined,
        tags: form.tags || undefined,
        variants: [{
          sku: form.sku || undefined,
          price: form.price || "0.00",
        }],
        images: form.image_url ? [form.image_url] : undefined,
      };
      await callEdge("create-product", payload);
      toast({ title: "Product created successfully" });
      setCreateOpen(false);
      setForm(emptyForm);
      loadProducts();
    } catch (e: any) {
      toast({ title: "Failed to create product", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const variant = editProduct.variants[0];
      const payload: any = {
        product_id: editProduct.id,
        title: form.title,
        body_html: form.body_html,
        vendor: form.vendor,
        product_type: form.product_type,
        tags: form.tags,
        variants: variant ? [{
          id: variant.id,
          sku: form.sku,
          price: form.price,
        }] : undefined,
      };
      await callEdge("update-product", payload);
      toast({ title: "Product updated successfully" });
      setEditProduct(null);
      setForm(emptyForm);
      loadProducts();
    } catch (e: any) {
      toast({ title: "Failed to update product", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: ShopifyProduct) => {
    const v = p.variants[0];
    setForm({
      title: p.title || "",
      body_html: p.body_html || "",
      vendor: p.vendor || "",
      product_type: p.product_type || "",
      tags: p.tags || "",
      sku: v?.sku || "",
      price: v?.price || "",
      image_url: "",
    });
    setEditProduct(p);
  };

  const handleAutoTag = async () => {
    setTagging(true);
    try {
      const data = await callEdge("auto-tag", {});
      toast({
        title: "Auto-tag complete",
        description: `Tagged: ${data.tagged}, Already tagged: ${data.already_tagged}, Unmatched: ${data.skipped}`,
      });
      loadProducts();
    } catch (e: any) {
      toast({ title: "Auto-tag failed", description: e.message, variant: "destructive" });
    } finally {
      setTagging(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.variants || []).some((v) => v.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const ProductForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Title *</label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Product title" />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} placeholder="Product description (HTML supported)" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">SKU</label>
          <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" />
        </div>
        <div>
          <label className="text-sm font-medium">Price</label>
          <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Vendor</label>
          <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor" />
        </div>
        <div>
          <label className="text-sm font-medium">Product Type</label>
          <Input value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })} placeholder="Type" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Tags</label>
        <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2, tag3" />
      </div>
      {!editProduct && (
        <div>
          <label className="text-sm font-medium">Image URL</label>
          <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
        </div>
      )}
      <DialogFooter>
        <Button onClick={onSubmit} disabled={saving || !form.title}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Shopify Products
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadProducts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleAutoTag} disabled={tagging || loading}>
              {tagging ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Tag className="h-4 w-4 mr-1" />}
              Auto-Tag Matched
            </Button>
            <Button size="sm" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Create Product
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No products found</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Stock</th>
                  <th className="text-left p-3 font-medium">Vendor</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const v = p.variants[0];
                  return (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 max-w-[200px] truncate font-medium">{p.title}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-xs">{v?.sku || "—"}</Badge>
                      </td>
                      <td className="p-3">{v?.price || "—"}</td>
                      <td className="p-3">{v?.inventory_quantity ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{p.vendor || "—"}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{filtered.length} of {products.length} products</p>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <ProductForm onSubmit={handleCreate} submitLabel="Create Product" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => { if (!o) setEditProduct(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <ProductForm onSubmit={handleUpdate} submitLabel="Update Product" />
        </DialogContent>
      </Dialog>
    </Card>
  );
}