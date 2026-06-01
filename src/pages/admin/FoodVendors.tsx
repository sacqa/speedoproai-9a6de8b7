import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ListOrdered } from "lucide-react";

const empty = {
  name: "", slug: "", cuisine: "", description: "", logo_url: "", cover_url: "",
  address: "", phone: "", delivery_time_min: 30, min_order: 0, rating: 4.5,
  is_open: true, is_active: true, is_featured: false, sort_order: 0,
  opens_at: "", closes_at: "", commission_percent: 0,
};

export default function AdminFoodVendors() {
  const vendors = useQuery({
    queryKey: ["admin", "food-vendors"],
    queryFn: async () => (await supabase.from("food_vendors").select("*").order("sort_order").order("name")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const upload = async (file: File, field: "logo_url" | "cover_url") => {
    const path = `vendors/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error } = await supabase.storage.from("food").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("food").getPublicUrl(path);
    setEditing((e: any) => ({ ...e, [field]: data.publicUrl }));
  };

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name required");
    const slug = (editing.slug || editing.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload = {
      ...editing,
      slug,
      delivery_time_min: Number(editing.delivery_time_min) || 30,
      min_order: Number(editing.min_order) || 0,
      rating: Number(editing.rating) || 4.5,
      sort_order: Number(editing.sort_order) || 0,
      commission_percent: Number(editing.commission_percent) || 0,
      opens_at: editing.opens_at || null,
      closes_at: editing.closes_at || null,
    };
    delete (payload as any).id;
    const op = editing.id
      ? supabase.from("food_vendors").update(payload).eq("id", editing.id)
      : supabase.from("food_vendors").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); vendors.refetch();
  };

  const remove = async (v: any) => {
    if (!confirm(`Delete "${v.name}" and all its menu items?`)) return;
    const { error } = await supabase.from("food_vendors").delete().eq("id", v.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); vendors.refetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">Food Vendors</h1>
        <Button onClick={() => { setEditing({ ...empty }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Vendor</Button>
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr><th className="text-left p-3">Vendor</th><th className="text-left">Cuisine</th><th className="text-center">Open</th><th className="text-center">Active</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody>
            {(vendors.data ?? []).map((v: any) => (
              <tr key={v.id} className="border-b border-border last:border-0">
                <td className="p-3 flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden">{v.logo_url && <img src={v.logo_url} alt="" className="h-full w-full object-cover" />}</div>
                  <div><div className="font-semibold">{v.name}</div><div className="text-xs text-muted-foreground">{v.delivery_time_min} min</div></div>
                </td>
                <td className="text-muted-foreground text-xs">{v.cuisine ?? "—"}</td>
                <td className="text-center"><span className={`text-xs px-2 py-0.5 rounded-pill ${v.is_open ? "bg-success/10 text-success" : "bg-muted"}`}>{v.is_open ? "Yes" : "No"}</span></td>
                <td className="text-center"><span className={`text-xs px-2 py-0.5 rounded-pill ${v.is_active ? "bg-success/10 text-success" : "bg-muted"}`}>{v.is_active ? "Yes" : "No"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Link to={`/admin/food-vendors/${v.id}/menu`}><Button size="sm" variant="outline" className="mr-1"><ListOrdered className="h-3.5 w-3.5 mr-1" />Menu</Button></Link>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {(vendors.data ?? []).length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No food vendors yet. Add your first restaurant or café.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Vendor" : "New Vendor"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Cuisine</Label><Input value={editing.cuisine ?? ""} onChange={(e) => setEditing({ ...editing, cuisine: e.target.value })} placeholder="Pakistani, Fast Food…" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Phone</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div><Label>Address</Label><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Delivery (min)</Label><Input type="number" value={editing.delivery_time_min ?? 30} onChange={(e) => setEditing({ ...editing, delivery_time_min: Number(e.target.value) })} /></div>
                <div><Label>Min Order</Label><Input type="number" value={editing.min_order ?? 0} onChange={(e) => setEditing({ ...editing, min_order: Number(e.target.value) })} /></div>
                <div><Label>Rating</Label><Input type="number" step="0.1" value={editing.rating ?? 4.5} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Logo</Label>
                  <div className="flex items-center gap-2">
                    {editing.logo_url && <img src={editing.logo_url} alt="" className="h-10 w-10 rounded object-cover" />}
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo_url")} />
                  </div>
                </div>
                <div>
                  <Label>Cover</Label>
                  <div className="flex items-center gap-2">
                    {editing.cover_url && <img src={editing.cover_url} alt="" className="h-10 w-16 rounded object-cover" />}
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover_url")} />
                  </div>
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_open} onCheckedChange={(v) => setEditing({ ...editing, is_open: v })} />Open</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />Active</label>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}