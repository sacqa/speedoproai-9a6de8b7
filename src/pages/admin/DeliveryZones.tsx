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
import { formatPKR } from "@/lib/format";
import { slugifyArea } from "@/lib/deliveryRules";

const blank = {
  area: "", delivery_fee: 99, min_order: 0, free_delivery_threshold: 1500,
  is_active: true, sort_order: 0,
};

export default function AdminDeliveryZones() {
  const zones = useQuery({
    queryKey: ["admin", "delivery-zones"],
    queryFn: async () => (await supabase.from("delivery_zones").select("*").order("sort_order")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    const area = String(editing.area ?? "").trim();
    if (area.length < 2) return toast.error("Area name is required");
    const payload = {
      area,
      slug: slugifyArea(area),
      delivery_fee: Number(editing.delivery_fee) || 0,
      min_order: Number(editing.min_order) || 0,
      free_delivery_threshold: editing.free_delivery_threshold === "" || editing.free_delivery_threshold == null ? null : Number(editing.free_delivery_threshold),
      is_active: !!editing.is_active,
      sort_order: Number(editing.sort_order) || 0,
    };
    const op = editing.id
      ? supabase.from("delivery_zones").update(payload).eq("id", editing.id)
      : supabase.from("delivery_zones").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); zones.refetch();
  };

  const remove = async (z: any) => {
    if (!confirm(`Delete ${z.area}?`)) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", z.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); zones.refetch(); }
  };

  const list = zones.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Delivery Rules</h1>
        <Button onClick={() => { setEditing({ ...blank }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add area</Button>
      </div>
      <p className="text-sm text-muted-foreground">Minimum order and delivery fee per area. These apply to every checkout.</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((z: any) => (
          <div key={z.id} className="bg-card rounded-xl border border-border p-4 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold">{z.area}</div>
                <div className="text-xs text-muted-foreground">{z.is_active ? "Active" : "Paused"}</div>
              </div>
              <div className="flex">
                <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...z }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(z)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <div className="text-sm">Fee {formatPKR(Number(z.delivery_fee))} · Min {formatPKR(Number(z.min_order))}</div>
            <div className="text-xs text-muted-foreground">
              Free over {z.free_delivery_threshold == null ? "—" : formatPKR(Number(z.free_delivery_threshold))}
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="text-muted-foreground text-sm py-10">No delivery areas yet.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit area" : "New area"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Area name</Label><Input value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Delivery fee (Rs)</Label><Input type="number" value={editing.delivery_fee} onChange={(e) => setEditing({ ...editing, delivery_fee: e.target.value })} /></div>
                <div><Label>Minimum order (Rs)</Label><Input type="number" value={editing.min_order} onChange={(e) => setEditing({ ...editing, min_order: e.target.value })} /></div>
              </div>
              <div><Label>Free delivery over (Rs, blank = never)</Label><Input type="number" value={editing.free_delivery_threshold ?? ""} onChange={(e) => setEditing({ ...editing, free_delivery_threshold: e.target.value })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><span className="text-sm">Accepting orders</span></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
