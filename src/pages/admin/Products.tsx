import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatPKR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Product = { id: string; name: string; description: string | null; price: number; stock: number; unit: string | null; image_url: string | null; category_id: string | null; is_active: boolean; is_featured: boolean; };

const empty = { name: "", description: "", price: 0, stock: 100, unit: "", image_url: "", category_id: "", is_active: true, is_featured: false };

const PAGE_SIZE = 25;

export default function AdminProducts() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> & { id?: string } | null>(null);
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => { if (v === null || v === "") p.delete(k); else p.set(k, v); });
    setParams(p, { replace: true });
  };

  const cats = useQuery({ queryKey: ["admin","cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const prods = useQuery({ queryKey: ["admin","prods"], queryFn: async () => (await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })).data ?? [] });

  const openNew = () => { setEditing(empty); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setOpen(true); };

  const remove = async (p: any) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); prods.refetch(); }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) return toast.error("Name required");
    if (!Number(editing.price)) return toast.error("Price required");
    const payload: any = {
      name: editing.name.trim(),
      description: editing.description ?? null,
      price: Number(editing.price),
      stock: Number(editing.stock ?? 0),
      unit: editing.unit || null,
      image_url: editing.image_url || null,
      category_id: editing.category_id || null,
      is_active: !!editing.is_active,
      is_featured: !!editing.is_featured,
    };
    const op = editing.id
      ? supabase.from("products").update(payload).eq("id", editing.id)
      : supabase.from("products").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    prods.refetch();
  };

  const uploadImage = async (file: File) => {
    if (!file) return;
    const path = `${Date.now()}-${file.name.replace(/\s/g,"_")}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setEditing((e) => ({ ...e, image_url: data.publicUrl }));
  };

  const filteredAll = (prods.data ?? []).filter((p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const total = filteredAll.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const list = filteredAll.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
      </div>
      <Input placeholder="Search products…" value={q} onChange={(e) => update({ q: e.target.value || null, page: null })} className="max-w-sm" />
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr><th className="text-left p-3">Image</th><th className="text-left">Name</th><th className="text-left">Category</th><th className="text-right">Price</th><th className="text-right">Stock</th><th className="text-center">Active</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {list.map((p: any) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3"><div className="h-10 w-10 rounded bg-muted overflow-hidden">{p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}</div></td>
                <td><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.unit ?? ""}</div></td>
                <td className="text-xs text-muted-foreground">{p.categories?.name ?? "—"}</td>
                <td className="text-right font-semibold">{formatPKR(Number(p.price))}</td>
                <td className="text-right">{p.stock}</td>
                <td className="text-center"><span className={`text-xs px-2 py-0.5 rounded-pill ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{p.is_active ? "Yes" : "No"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No products</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {list.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{(safePage - 1) * PAGE_SIZE + list.length} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => update({ page: String(safePage - 1) })}>Previous</Button>
          <span className="px-2 py-1 font-semibold text-foreground">Page {safePage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => update({ page: String(safePage + 1) })}>Next</Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Price (PKR)</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><Label>Stock</Label><Input type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></div>
                <div><Label>Unit</Label><Input value={editing.unit ?? ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="kg, pcs..." /></div>
              </div>
              <div><Label>Category</Label>
                <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>{(cats.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Image</Label>
                <div className="flex items-center gap-3">
                  {editing.image_url && <img src={editing.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />Active</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} />Featured</label>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}