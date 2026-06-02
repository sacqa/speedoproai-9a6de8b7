import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = { name: "", slug: "", icon: "", sort_order: 0, is_active: true, is_popular: false, is_hot_selling: false };

export default function AdminCategories() {
  const cats = useQuery({ queryKey: ["admin","categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">Categories</h1>
        <Button onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Category</Button>
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