import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Save } from "lucide-react";

type Receipt = { business_name: string; address: string; phone: string; tax_id: string; footer: string; logo_url: string };

export default function ReceiptSettings() {
  const [v, setV] = useState<Receipt>({ business_name: "", address: "", phone: "", tax_id: "", footer: "", logo_url: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "receipt").maybeSingle()
      .then(({ data }) => data?.value && setV({ ...v, ...(data.value as any) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadLogo = async (file: File) => {
    setBusy(true);
    const path = `receipt-logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setBusy(false); return; }
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setV({ ...v, logo_url: data.publicUrl });
    setBusy(false);
    toast.success("Logo uploaded");
  };

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").upsert({ key: "receipt", value: v as any, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Receipt settings saved");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-extrabold">Receipt Settings</h1>
      <p className="text-sm text-muted-foreground">These details will appear on every printed receipt.</p>

      <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {v.logo_url ? <img src={v.logo_url} alt="logo" className="h-16 w-16 object-contain bg-muted rounded" /> : <div className="h-16 w-16 rounded bg-muted" />}
          <label className="inline-flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer">
            <Upload className="h-4 w-4" /> Upload logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </label>
          {v.logo_url && <Button size="sm" variant="ghost" onClick={() => setV({ ...v, logo_url: "" })}>Remove</Button>}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Business name</Label><Input value={v.business_name} onChange={(e) => setV({ ...v, business_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
          <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></div>
          <div className="space-y-1"><Label>NTN / Tax ID</Label><Input value={v.tax_id} onChange={(e) => setV({ ...v, tax_id: e.target.value })} /></div>
          <div className="space-y-1 sm:col-span-2"><Label>Footer message</Label><Textarea value={v.footer} onChange={(e) => setV({ ...v, footer: e.target.value })} className="min-h-16" /></div>
        </div>
        <Button onClick={save} disabled={busy} className="gap-1"><Save className="h-4 w-4" />Save settings</Button>
      </div>
    </div>
  );
}