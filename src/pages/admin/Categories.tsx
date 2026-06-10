import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { AIImageButton } from "@/components/admin/AIImageButton";
import { supabase as sb } from "@/integrations/supabase/client";

const empty = { name: "", slug: "", icon: "", image_url: "", sort_order: 0, is_active: true, is_popular: false, is_hot_selling: false };

export default function AdminCategories() {
  const cats = useQuery({ queryKey: ["admin","categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const bulkGenerateIcons = async () => {
    const missing = (cats.data ?? []).filter((c: any) => !c.image_url);
    if (missing.length === 0) return toast.info("All categories already have images.");
    if (!confirm(`Generate AI images for ${missing.length} categor${missing.length === 1 ? "y" : "ies"} without an image?`)) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const c of missing) {
      try {
        const { data, error } = await sb.functions.invoke("generate-image", {
          body: { prompt: c.name, preset: "square", bucket: "products", context: "category" },
        });
        if (error || !data?.url) throw new Error(error?.message || data?.error || "failed");
        const { error: upErr } = await supabase.from("categories").update({ image_url: data.url }).eq("id", c.id);
        if (upErr) throw upErr;
        ok++;
        toast.success(`Generated: ${c.name}`);
        cats.refetch();
      } catch (e: any) {
        fail++;
        toast.error(`${c.name}: ${e.message}`);
      }
    }
    setBulkBusy(false);
    toast.success(`Done. ${ok} generated, ${fail} failed.`);
  };

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name required");
    if (!editing.slug?.trim()) return toast.error("Slug required");
    const payload = { ...editing, sort_order: Number(editing.sort_order ?? 0) };
    const op = editing.id
      ? supabase.from("categories").update(payload).eq("id", editing.id)
      : supabase.from("categories").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); cats.refetch();
  };
  const remove = async (c: any) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); cats.refetch(); }
  };

  const markAllProductsFeatured = async (c: any, makeFeatured: boolean) => {
    if (!confirm(`${makeFeatured ? "Mark" : "Unmark"} ALL products in "${c.name}" as Popular?`)) return;
    const { error, count } = await supabase
      .from("products")
      .update({ is_featured: makeFeatured }, { count: "exact" })
      .eq("category_id", c.id);
    if (error) return toast.error(error.message);
    toast.success(`${count ?? 0} product(s) updated`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">Categories</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={bulkBusy} onClick={bulkGenerateIcons}>
            {bulkBusy ? "Generating…" : "AI: Generate Missing Icons"}
          </Button>
          <Button onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Category</Button>
        </div>
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left p-3">Name</th><th className="text-left">Slug</th><th className="text-center">Order</th><th className="text-center">Popular</th><th className="text-center">Active</th><th></th></tr></thead>
          <tbody>
            {(cats.data ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-semibold">{c.icon} {c.name}</td>
                <td className="text-muted-foreground text-xs">{c.slug}</td>
                <td className="text-center">{c.sort_order}</td>
                <td className="text-center"><span className={`text-xs px-2 py-0.5 rounded-pill ${c.is_popular ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{c.is_popular ? "Yes" : "No"}</span></td>
                <td className="text-center"><span className={`text-xs px-2 py-0.5 rounded-pill ${c.is_active ? "bg-success/10 text-success" : "bg-muted"}`}>{c.is_active ? "Yes" : "No"}</span></td>
                <td className="text-right p-3">
                  <Button size="sm" variant="ghost" className="mr-1" onClick={() => markAllProductsFeatured(c, true)} title="Mark all products as Popular"><Star className="h-4 w-4 mr-1" />Popular all</Button>
                  <Button size="sm" variant="ghost" className="mr-1" onClick={() => markAllProductsFeatured(c, false)} title="Unmark all">Unpopular all</Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {(cats.data ?? []).length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No categories</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s/g,"-") })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Icon (emoji)</Label><Input value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="🥦" /></div>
              <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label>Image (optional — used as icon if set)</Label>
              <div className="flex items-center gap-3 mt-1">
                {editing.image_url && <img src={editing.image_url} alt="" className="h-14 w-14 rounded-2xl object-cover border" />}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const path = `cat-${Date.now()}-${f.name.replace(/\s/g,"_")}`;
                    const { error } = await sb.storage.from("products").upload(path, f, { upsert: true });
                    if (error) return toast.error(error.message);
                    const { data } = sb.storage.from("products").getPublicUrl(path);
                    setEditing({ ...editing, image_url: data.publicUrl });
                  }}
                />
                <AIImageButton
                  context="category"
                  preset="square"
                  bucket="products"
                  defaultPrompt={editing.name ?? ""}
                  onGenerated={(url) => setEditing({ ...editing, image_url: url })}
                />
                {editing.image_url && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing({ ...editing, image_url: "" })}>Remove</Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />Active</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_popular} onCheckedChange={(v) => setEditing({ ...editing, is_popular: v })} />Show on Home (Popular)</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_hot_selling} onCheckedChange={(v) => setEditing({ ...editing, is_hot_selling: v })} />Hot Selling (Home)</label>
            </div>
            <Button onClick={save} className="w-full">Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}