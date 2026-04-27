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

const empty = { title: "", subtitle: "", image_url: "", cta_label: "", cta_link: "", sort_order: 0, is_active: true };

export default function AdminBanners() {
  const banners = useQuery({ queryKey: ["admin","banners"], queryFn: async () => (await supabase.from("banners").select("*").order("sort_order")).data ?? [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const upload = async (file: File) => {
    const path = `${Date.now()}-${file.name.replace(/\s/g,"_")}`;
    const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setEditing((e: any) => ({ ...e, image_url: data.publicUrl }));
  };
  const save = async () => {
    if (!editing.title?.trim() || !editing.image_url) return toast.error("Title and image required");
    const payload = { ...editing, sort_order: Number(editing.sort_order ?? 0) };
    const op = editing.id ? supabase.from("banners").update(payload).eq("id", editing.id) : supabase.from("banners").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); banners.refetch();
  };
  const remove = async (b: any) => {
    if (!confirm("Delete banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); banners.refetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">Banners</h1>
        <Button onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Banner</Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {(banners.data ?? []).map((b: any) => (
          <div key={b.id} className="bg-card rounded-xl shadow-card overflow-hidden">
            {b.image_url && <img src={b.image_url} alt={b.title} className="w-full h-32 object-cover" />}
            <div className="p-3 flex items-start justify-between">
              <div>
                <div className="font-bold">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.subtitle}</div>
                <div className="text-xs text-muted-foreground mt-1">{b.cta_label} → {b.cta_link}</div>
              </div>
              <div className="flex">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(b)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {(banners.data ?? []).length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">No banners</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Banner" : "New Banner"}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <div><Label>Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></div>
            <div><Label>Image</Label>
              <div className="flex items-center gap-2">
                {editing.image_url && <img src={editing.image_url} alt="" className="h-12 w-20 rounded object-cover" />}
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>CTA Label</Label><Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} /></div>
              <div><Label>CTA Link</Label><Input value={editing.cta_link ?? ""} onChange={(e) => setEditing({ ...editing, cta_link: e.target.value })} placeholder="/speedmart" /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1"><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
              <label className="flex items-center gap-2 text-sm pt-6"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />Active</label>
            </div>
            <Button onClick={save} className="w-full">Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}