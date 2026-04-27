import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function AdminPricing() {
  const rules = useQuery({ queryKey: ["admin","pricing"], queryFn: async () => (await supabase.from("pricing_rules").select("*").order("key")).data ?? [] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const save = async () => {
    if (!editing.key?.trim()) return toast.error("Key required");
    const payload = { key: editing.key.trim(), value: Number(editing.value ?? 0), description: editing.description ?? null };
    const op = editing.id ? supabase.from("pricing_rules").update(payload).eq("id", editing.id) : supabase.from("pricing_rules").insert(payload);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); rules.refetch();
  };
  const remove = async (r: any) => {
    if (!confirm("Delete rule?")) return;
    const { error } = await supabase.from("pricing_rules").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); rules.refetch(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Pricing Rules</h1>
        <Button onClick={() => { setEditing({ key: "", value: 0, description: "" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Rule</Button>
      </div>
      <p className="text-sm text-muted-foreground">Common keys: <code>delivery_fee</code>, <code>service_charge</code>, <code>free_delivery_threshold</code></p>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left p-3">Key</th><th className="text-right">Value</th><th className="text-left pl-4">Description</th><th></th></tr></thead>
          <tbody>
            {(rules.data ?? []).map((r: any) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3 font-mono text-xs">{r.key}</td>
                <td className="text-right font-bold">{Number(r.value)}</td>
                <td className="pl-4 text-xs text-muted-foreground">{r.description ?? "—"}</td>
                <td className="text-right p-3">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {(rules.data ?? []).length === 0 && <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No rules</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Rule" : "New Rule"}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <div><Label>Key</Label><Input value={editing.key ?? ""} onChange={(e) => setEditing({ ...editing, key: e.target.value })} /></div>
            <div><Label>Value (number)</Label><Input type="number" value={editing.value ?? 0} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} /></div>
            <div><Label>Description</Label><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <Button onClick={save} className="w-full">Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}