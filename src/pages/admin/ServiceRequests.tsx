import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, MapPin, Clock, Image as ImageIcon, Trash2 } from "lucide-react";
import { SERVICE_CATEGORIES, SR_STATUSES, URGENCY, labelOf } from "@/lib/serviceRequests";

type SR = any;

export default function ServiceRequests() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const list = useQuery({
    queryKey: ["admin-service-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_requests").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = (list.data ?? []).filter((r: SR) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Service Requests</h1>
        <p className="text-sm text-muted-foreground">Repairs & home services submitted by customers.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "All" }, ...SR_STATUSES].map((s) => (
          <Button key={s.value} size="sm" variant={filter === s.value ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(s.value)}>
            {s.label} ({s.value === "all" ? list.data?.length ?? 0 : (list.data ?? []).filter((r: SR) => r.status === s.value).length})
          </Button>
        ))}
      </div>
      {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!list.isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground bg-card rounded-xl p-6 text-center">No requests.</p>}
      <div className="space-y-3">
        {rows.map((r: SR) => <RequestCard key={r.id} r={r} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-service-requests"] })} />)}
      </div>
    </div>
  );
}

function RequestCard({ r, onSaved }: { r: SR; onSaved: () => void }) {
  const [status, setStatus] = useState(r.status);
  const [providerName, setProviderName] = useState(r.provider_name ?? "");
  const [providerPhone, setProviderPhone] = useState(r.provider_phone ?? "");
  const [notes, setNotes] = useState(r.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const next = status === "pending" && providerName.trim() ? "assigned" : status;
    const { error } = await supabase.from("service_requests").update({
      status: next,
      provider_name: providerName.trim().slice(0, 80) || null,
      provider_phone: providerPhone.trim().slice(0, 20) || null,
      admin_notes: notes.trim().slice(0, 1000) || null,
    }).eq("id", r.id);
    setSaving(false);
    if (error) return toast.error("Could not save");
    setStatus(next);
    toast.success("Saved");
    onSaved();
  };

  const del = async () => {
    if (!confirm("Delete this request?")) return;
    const { error } = await supabase.from("service_requests").delete().eq("id", r.id);
    if (error) return toast.error("Could not delete");
    onSaved();
  };

  const openPhoto = async () => {
    const { data } = await supabase.storage.from("request-uploads").createSignedUrl(r.attachment_url, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not open photo");
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold">{r.request_number}</span>
        <Badge variant="secondary">{labelOf(SERVICE_CATEGORIES, r.category)}</Badge>
        <Badge variant={r.urgency === "urgent" ? "destructive" : "outline"}>{labelOf(URGENCY, r.urgency)}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{r.description}</p>
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{r.customer_name} · <a className="text-primary font-semibold" href={`tel:${r.phone}`}>{r.phone}</a></div>
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{r.address}, {r.area}
          {r.geo?.lat && <a className="text-primary text-xs font-semibold" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${r.geo.lat},${r.geo.lng}`}>Map</a>}
        </div>
        {r.preferred_at && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{new Date(r.preferred_at).toLocaleString()}</div>}
        {r.attachment_url && <button onClick={openPhoto} className="flex items-center gap-2 text-primary font-semibold"><ImageIcon className="h-4 w-4" />View photo</button>}
      </div>
      <div className="grid sm:grid-cols-3 gap-2 pt-2 border-t border-border/60">
        <Input placeholder="Provider name" value={providerName} onChange={(e) => setProviderName(e.target.value)} />
        <Input placeholder="Provider phone" inputMode="numeric" value={providerPhone} onChange={(e) => setProviderPhone(e.target.value.replace(/\D/g, ""))} />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {SR_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <Textarea placeholder="Admin notes (internal)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={del}><Trash2 className="h-4 w-4" /></Button>
        <Button size="sm" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
