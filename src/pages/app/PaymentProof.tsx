import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export default function PaymentProof() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [txn, setTxn] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) { toast.error("Upload a screenshot"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Image only"); return; }
    if (!txn.trim()) { toast.error("Enter transaction ID"); return; }
    if (!user || !id) return;
    setBusy(true);
    const path = `${user.id}/${id}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
    const { error } = await supabase.from("orders").update({
      payment_proof_url: signed?.signedUrl ?? path,
      payment_txn_id: txn.trim(),
      payment_status: "submitted",
      status: "payment_under_review",
    }).eq("id", id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    nav(`/orders/${id}/confirm`, { replace: true });
  };

  return (
    <div className="p-4 lg:p-0 space-y-5 max-w-md mx-auto">
      <h1 className="text-2xl font-extrabold">Upload Payment Proof</h1>
      <p className="text-sm text-muted-foreground">Pay using the account shown on the previous step, then upload your screenshot below.</p>
      <div>
        <Label>Transaction ID</Label>
        <Input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="TXN1234567" className="mt-1.5 h-12" maxLength={40} />
      </div>
      <div>
        <Label>Screenshot</Label>
        <label className="mt-1.5 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer bg-card">
          <Upload className="h-6 w-6 text-primary mb-2" />
          <span className="text-sm font-semibold">{file ? file.name : "Tap to choose image"}</span>
          <span className="text-xs text-muted-foreground mt-0.5">Max 5MB · JPG / PNG</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <Button className="w-full h-12 rounded-pill" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit Proof"}</Button>
    </div>
  );
}