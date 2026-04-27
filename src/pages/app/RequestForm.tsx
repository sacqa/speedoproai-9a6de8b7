import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload } from "lucide-react";

type Mode = "pharmacy" | "speedsend" | "custom";
const TITLE: Record<Mode, string> = { pharmacy: "Pharmacy Order", speedsend: "SpeedSend Parcel", custom: "Custom Order" };

export default function RequestForm({ mode }: { mode: Mode }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [budget, setBudget] = useState("");
  // SpeedSend
  const [s, setS] = useState({ sender_name: "", sender_phone: "", recipient_name: "", recipient_phone: "", address: "", package_type: "Document", weight: "", fragile: false });

  const submit = async () => {
    if (!user) { nav("/login"); return; }
    setBusy(true);
    let prescriptionUrl: string | undefined;
    if (mode === "pharmacy" && file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("prescriptions").upload(path, file);
      if (up.error) { toast.error(up.error.message); setBusy(false); return; }
      prescriptionUrl = path;
    }
    const payload: any = {
      user_id: user.id, type: mode, status: "submitted",
      payment_status: "pending", subtotal: 0, delivery_fee: 0, service_charge: 0, total: 0,
      notes: text,
      prescription_url: prescriptionUrl,
    };
    if (mode === "speedsend") payload.speedsend_details = s;
    if (mode === "custom") payload.custom_details = { description: text, budget: budget ? Number(budget) : null };

    const { data: order, error } = await supabase.from("orders").insert(payload).select().single();
    if (error || !order) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }
    toast.success("Request submitted");
    nav(`/orders/${order.id}/confirm`, { replace: true });
  };

  return (
    <div className="p-4 lg:p-0 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-extrabold">{TITLE[mode]}</h1>
      <p className="text-sm text-muted-foreground">Speedo will review your request and send an estimate. Payment is collected after the estimate is approved.</p>

      {mode === "pharmacy" && (
        <>
          <div>
            <Label>List medicines (or upload prescription below)</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={1000} placeholder="Panadol Extra × 2, Augmentin 625mg × 1 strip, …" />
          </div>
          <div>
            <Label>Prescription image</Label>
            <label className="mt-1.5 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer bg-card">
              <Upload className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-semibold">{file ? file.name : "Tap to upload"}</span>
              <span className="text-xs text-muted-foreground mt-0.5">Max 5MB · JPG / PNG</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f && f.size > 5*1024*1024) { toast.error("Max 5MB"); return; } setFile(f ?? null);
              }} />
            </label>
          </div>
        </>
      )}

      {mode === "speedsend" && (
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Sender name" value={s.sender_name} onChange={(e) => setS({ ...s, sender_name: e.target.value })} />
          <Input placeholder="Sender phone" value={s.sender_phone} onChange={(e) => setS({ ...s, sender_phone: e.target.value })} />
          <Input placeholder="Recipient name" value={s.recipient_name} onChange={(e) => setS({ ...s, recipient_name: e.target.value })} />
          <Input placeholder="Recipient phone" value={s.recipient_phone} onChange={(e) => setS({ ...s, recipient_phone: e.target.value })} />
          <Input className="col-span-2" placeholder="Drop-off address" value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} />
          <Input placeholder="Package type" value={s.package_type} onChange={(e) => setS({ ...s, package_type: e.target.value })} />
          <Input placeholder="Weight (kg)" value={s.weight} onChange={(e) => setS({ ...s, weight: e.target.value })} />
          <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={s.fragile} onChange={(e) => setS({ ...s, fragile: e.target.checked })} /> Fragile</label>
          <Textarea className="col-span-2" placeholder="Extra instructions" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        </div>
      )}

      {mode === "custom" && (
        <>
          <div>
            <Label>What do you need?</Label>
            <Textarea rows={6} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the items, where to source them, and any details we should know…" />
          </div>
          <div>
            <Label>Budget (PKR, optional)</Label>
            <Input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g,""))} />
          </div>
        </>
      )}

      <Button className="w-full h-12 rounded-pill" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit Request"}</Button>
    </div>
  );
}