import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { formatPKR } from "@/lib/format";

export default function AdminFoodVendorMenu() {
  const { id: vendorId } = useParams();
  const vendor = useQuery({
    queryKey: ["admin", "vendor", vendorId],
    enabled: !!vendorId,
    queryFn: async () => (await supabase.from("food_vendors").select("*").eq("id", vendorId!).single()).data,
  });
  const cats = useQuery({
    queryKey: ["admin", "menu-cats", vendorId],
    enabled: !!vendorId,
    queryFn: async () => (await supabase.from("food_menu_categories").select("*").eq("vendor_id", vendorId!).order("sort_order")).data ?? [],
  });
  const items = useQuery({
    queryKey: ["admin", "menu-items", vendorId],
    enabled: !!vendorId,
    queryFn: async () => (await supabase.from("food_menu_items").select("*").eq("vendor_id", vendorId!).order("sort_order")).data ?? [],
  });

  const [catName, setCatName] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const addCat = async () => {
    if (!catName.trim()) return;
    const { error } = await supabase.from("food_menu_categories").insert({ vendor_id: vendorId!, name: catName.trim(), sort_order: cats.data?.length ?? 0 });
    if (error) return toast.error(error.message);
    setCatName(""); cats.refetch();
  };

  const delCat = async (c: any) => {
    if (!confirm(`Delete category "${c.name}"? Items move to "Other".`)) return;
    const { error } = await supabase.from("food_menu_categories").delete().eq("id", c.id);
    if (error) toast.error(error.message); else { cats.refetch(); items.refetch(); }
  };

  const openNewItem = () => setEditing({ name: "", description: "", price: 0, image_url: "", category_id: null, is_available: true, sort_order: 0 });
  const openEdit = (i: any) => setEditing(i);

  const uploadItemImg = async (file: File) => {
    const path = `items/${vendorId}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error } = await supabase.storage.from("food").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("food").getPublicUrl(path);
    setEditing((e: any) => ({ ...e, image_url: data.publicUrl }));
  };

  const saveItem = async () => {
    if (!editing.name?.trim()) return toast.error("Name required");
    const payload = {
      vendor_id: vendorId!,
      name: editing.name.trim(),
      description: editing.description ?? null,
      price: Number(editing.price),
      image_url: editing.image_url || null,
      category_id: editing.category_id || null,
      is_available: !!editing.is_available,
      sort_order: Number(editing.sort_order ?? 0),
    };
    const op = editing.id
      ? supabase.from("food_menu_items").update(payload).eq("id", editing.id)
      : supabase.from("food_menu_items").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditing(null); items.refetch();
  };

  const delItem = async (i: any) => {
    if (!confirm(`Delete "${i.name}"?`)) return;
    const { error } = await supabase.from("food_menu_items").delete().eq("id", i.id);
    if (error) toast.error(error.message); else items.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin/food-vendors"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-extrabold">{vendor.data?.name ?? "Menu"}</h1>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
        <h2 className="font-bold">Menu categories</h2>
        <div className="flex flex-wrap gap-2">
          {(cats.data ?? []).map((c: any) => (
            <div key={c.id} className="flex items-center gap-1 bg-muted rounded-full pl-3 pr-1 py-1 text-sm">
              {c.name}
              <button onClick={() => delCat(c)} className="p-1 text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="New category name…" value={catName} onChange={(e) => setCatName(e.target.value)} className="max-w-xs" />
          <Button onClick={addCat}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold">Menu items</h2>
          <Button onClick={openNewItem}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr><th className="text-left p-3">Item</th><th className="text-left">Category</th><th className="text-right">Price</th><th className="text-center">Available</th><th></th></tr>
          </thead>
          <tbody>
            {(items.data ?? []).map((i: any) => (
              <tr key={i.id} className="border-b border-border last:border-0">
                <td className="p-3 flex items-center gap-2">
                  <div className="h-9 w-9 rounded bg-muted overflow-hidden">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</div>
                  <div><div className="font-semibold">{i.name}</div><div className="text-xs text-muted-foreground line-clamp-1 max-w-[260px]">{i.description}</div></div>
                </td>
                <td className="text-xs text-muted-foreground">{(cats.data ?? []).find((c: any) => c.id === i.category_id)?.name ?? "—"}</td>
                <td className="text-right font-semibold">{formatPKR(Number(i.price))}</td>
                <td className="text-center"><span className={`text-xs px-2 py-0.5 rounded-pill ${i.is_available ? "bg-success/10 text-success" : "bg-muted"}`}>{i.is_available ? "Yes" : "No"}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => delItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {(items.data ?? []).length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No items yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Item" : "New Item"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Price (PKR)</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                <div><Label>Category</Label>
                  <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
                    <SelectContent>{(cats.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Image</Label>
                <div className="flex items-center gap-2">
                  {editing.image_url && <img src={editing.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadItemImg(e.target.files[0])} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_available} onCheckedChange={(v) => setEditing({ ...editing, is_available: v })} />Available</label>
              <Button onClick={saveItem} className="w-full">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}