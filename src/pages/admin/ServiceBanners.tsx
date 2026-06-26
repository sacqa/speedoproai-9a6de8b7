import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AIImageButton } from "@/components/admin/AIImageButton";

const ICON_CHOICES = [
  "ShoppingBasket", "UtensilsCrossed", "Pill", "Package",
  "Truck", "Sparkles", "Heart", "Coffee", "Gift", "Store",
];

const empty = {
  service_key: "",
  title: "",
  subtitle: "",
  image_url: "",
  link: "/",
  gradient_from: "#E9D5FF",
  gradient_to: "#F5F3FF",
  icon_name: "ShoppingBasket",
  sort_order: 0,
  is_active: true,
};

export default function AdminServiceBanners() {
  const q = useQuery({
    queryKey: ["admin", "service_banners"],
    queryFn: async () => (await supabase.from("service_banners").select("*").order("sort_order")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    if (!editing.title?.trim() || !editing.service_key?.trim()) {
      return toast.error("Service key and title are required");
    }
    const payload = { ...editing, sort_order: Number(editing.sort_order ?? 0) };
    const op = editing.id
      ? supabase.from("service_banners").update(payload).eq("id", editing.id)
      : supabase.from("service_banners").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    q.refetch();
  };

  const remove = async (b: any) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    const { error } = await supabase.from("service_banners").delete().eq("id", b.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); q.refetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Service Banners</h1>
          <p className="text-sm text-muted-foreground">Editable 4-up homepage tiles (SpeedMart, Food, Pharmacy, SpeedSend).</p>
        </div>
        <Button onClick={() => { setEditing(empty); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add tile
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(q.data ?? []).map((b: any) => (
          <div
            key={b.id}
            className="relative rounded-3xl overflow-hidden border border-white/60 shadow-card"
            style={{ backgroundImage: `linear-gradient(135deg, ${b.gradient_from}, ${b.gradient_to})` }}
          >
            {b.image_url && (
              <img src={b.image_url} alt="" loading="lazy"
                className="absolute -right-3 -bottom-3 h-20 w-20 object-contain opacity-90" />
            )}
            <div className="relative p-4">
              <div className="text-[10px] uppercase tracking-widest opacity-60 font-bold">{b.service_key}</div>
              <div className="font-extrabold text-lg mt-0.5">{b.title}</div>
              <div className="text-xs opacity-70">{b.subtitle}</div>
              <div className="text-[11px] mt-1 opacity-60">→ {b.link}</div>
              <div className="mt-3 flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(b)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                {!b.is_active && (
                  <span className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold">HIDDEN</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {(q.data ?? []).length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-10">No service banners yet.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit tile" : "New service tile"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Service key</Label>
                  <Input value={editing.service_key} onChange={(e) => setEditing({ ...editing, service_key: e.target.value })} placeholder="speedmart" />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
              <div>
                <Label>Link</Label>
                <Input value={editing.link} onChange={(e) => setEditing({ ...editing, link: e.target.value })} placeholder="/speedmart" />
              </div>
              <div>
                <Label>Icon</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.icon_name ?? "ShoppingBasket"}
                  onChange={(e) => setEditing({ ...editing, icon_name: e.target.value })}
                >
                  {ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Gradient from</Label>
                  <Input type="color" value={editing.gradient_from ?? "#E9D5FF"} onChange={(e) => setEditing({ ...editing, gradient_from: e.target.value })} />
                </div>
                <div>
                  <Label>Gradient to</Label>
                  <Input type="color" value={editing.gradient_to ?? "#F5F3FF"} onChange={(e) => setEditing({ ...editing, gradient_to: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Decorative image (PNG, transparent, ~400×400)</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  {editing.image_url && <img src={editing.image_url} alt="" className="h-12 w-12 rounded-lg object-contain bg-muted" />}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const path = `service/${Date.now()}-${f.name.replace(/\s/g, "_")}`;
                      const { error } = await supabase.storage.from("banners").upload(path, f, { upsert: true });
                      if (error) return toast.error(error.message);
                      const { data } = supabase.storage.from("banners").getPublicUrl(path);
                      setEditing((s: any) => ({ ...s, image_url: data.publicUrl }));
                    }}
                  />
                  <AIImageButton
                    context="service-banner"
                    bucket="banners"
                    defaultPrompt={editing.title}
                    onGenerated={(url) => setEditing((s: any) => ({ ...s, image_url: url }))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Active
              </label>

              {/* Live preview */}
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Live preview</Label>
                <div
                  className="relative mt-2 rounded-3xl overflow-hidden h-32 border border-white/60 shadow-card"
                  style={{ backgroundImage: `linear-gradient(135deg, ${editing.gradient_from}, ${editing.gradient_to})` }}
                >
                  {editing.image_url && (
                    <img src={editing.image_url} alt="" className="absolute -right-3 -bottom-3 h-24 w-24 object-contain" />
                  )}
                  <div className="relative p-4">
                    <div className="font-extrabold text-base">{editing.title || "Title"}</div>
                    <div className="text-xs opacity-70">{editing.subtitle || "Subtitle"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}