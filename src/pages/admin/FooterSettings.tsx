import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";
import type { FooterValue } from "@/components/layout/Footer";

const EMPTY: FooterValue = {
  brand_tagline: "Hyperlocal delivery in Dipalpur, Pakistan.",
  company_links: [{ label: "About", url: "/about" }, { label: "Contact", url: "/contact" }, { label: "Careers", url: "/careers" }],
  legal_links: [{ label: "Privacy Policy", url: "/privacy" }, { label: "Terms of Service", url: "/terms" }],
  app_note: "Install Speedo from your browser menu → Add to Home Screen.",
  copyright: "© Speedo",
};

export default function FooterSettings() {
  const [v, setV] = useState<FooterValue>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "footer").maybeSingle()
      .then(({ data }) => { if (data?.value) setV({ ...EMPTY, ...(data.value as FooterValue) }); });
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").upsert({ key: "footer", value: v as any, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Footer saved");
  };

  const editList = (k: "company_links" | "legal_links", i: number, patch: Partial<{ label: string; url: string }>) => {
    const arr = [...(v[k] ?? [])];
    arr[i] = { ...arr[i], ...patch };
    setV({ ...v, [k]: arr });
  };
  const addRow = (k: "company_links" | "legal_links") => setV({ ...v, [k]: [...(v[k] ?? []), { label: "", url: "" }] });
  const rmRow = (k: "company_links" | "legal_links", i: number) => setV({ ...v, [k]: (v[k] ?? []).filter((_, idx) => idx !== i) });

  const linkEditor = (title: string, k: "company_links" | "legal_links") => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button size="sm" variant="ghost" onClick={() => addRow(k)} className="gap-1"><Plus className="h-3 w-3" />Add link</Button>
      </div>
      <div className="space-y-2">
        {(v[k] ?? []).map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Label" value={l.label} onChange={(e) => editList(k, i, { label: e.target.value })} />
            <Input placeholder="/url" value={l.url} onChange={(e) => editList(k, i, { url: e.target.value })} />
            <Button size="icon" variant="ghost" onClick={() => rmRow(k, i)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-extrabold">Footer Settings</h1>
      <p className="text-sm text-muted-foreground">Edit the desktop footer content shown on every customer page.</p>

      <div className="bg-card rounded-xl shadow-card p-4 space-y-4">
        <div className="space-y-1"><Label>Brand tagline</Label><Input value={v.brand_tagline ?? ""} onChange={(e) => setV({ ...v, brand_tagline: e.target.value })} /></div>
        {linkEditor("Company links", "company_links")}
        {linkEditor("Legal links", "legal_links")}
        <div className="space-y-1"><Label>Get the app note</Label><Textarea value={v.app_note ?? ""} onChange={(e) => setV({ ...v, app_note: e.target.value })} className="min-h-16" /></div>
        <div className="space-y-1"><Label>Copyright line</Label><Input value={v.copyright ?? ""} onChange={(e) => setV({ ...v, copyright: e.target.value })} /></div>
        <Button onClick={save} disabled={busy} className="gap-1"><Save className="h-4 w-4" />Save footer</Button>
      </div>
    </div>
  );
}