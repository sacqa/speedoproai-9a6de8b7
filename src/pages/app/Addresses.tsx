import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addressSchema } from "@/lib/validators";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export default function Addresses() {
  const { user } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ label: "Home", recipient_name: "", phone: "", area: "Dipalpur", street: "", details: "" });
  const q = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false })).data ?? [],
  });

  const save = async () => {
    const r = addressSchema.safeParse(form);
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    if (!user) return;
    const row = { ...(r.data as Required<typeof r.data>), user_id: user.id, is_default: (q.data ?? []).length === 0, details: r.data.details || null };
    const { error } = await supabase.from("addresses").insert(row as any);
    if (error) { toast.error(error.message); return; }
    setShowNew(false);
    setForm({ label: "Home", recipient_name: "", phone: "", area: "Dipalpur", street: "", details: "" });
    q.refetch();
    toast.success("Address saved");
  };

  const del = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    q.refetch();
  };

  return (
    <div className="p-4 lg:p-0 space-y-3 max-w-md mx-auto">
      <h1 className="text-2xl font-extrabold">Saved Addresses</h1>
      {(q.data ?? []).map((a: any) => (
        <div key={a.id} className="bg-card rounded-xl shadow-card p-4 flex gap-3">
          <div className="flex-1">
            <div className="font-semibold">{a.label} {a.is_default && <span className="text-[10px] bg-primary-tint text-primary px-2 py-0.5 rounded-pill ml-1">Default</span>}</div>
            <div className="text-sm text-muted-foreground">{a.recipient_name} · {a.phone}</div>
            <div className="text-sm text-muted-foreground">{a.street}, {a.area}</div>
          </div>
          <button onClick={() => del(a.id)} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      {showNew ? (
        <div className="bg-card rounded-xl shadow-card p-4 space-y-2">
          <Input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input placeholder="Recipient name" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
          <Input placeholder="03xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g,"").slice(0,11) })} />
          <Input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <Input placeholder="Street / house" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <Input placeholder="Details (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          <div className="flex gap-2"><Button onClick={save} className="flex-1 rounded-pill">Save</Button><Button variant="outline" onClick={() => setShowNew(false)} className="rounded-pill">Cancel</Button></div>
        </div>
      ) : (
        <Button onClick={() => setShowNew(true)} variant="outline" className="w-full h-12 rounded-pill"><Plus className="h-4 w-4 mr-1" /> Add new address</Button>
      )}
    </div>
  );
}