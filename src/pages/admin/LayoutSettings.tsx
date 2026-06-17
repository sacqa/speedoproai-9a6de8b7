import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type GridCols = { mobile: number; tablet: number; desktop: number };
const DEFAULTS: GridCols = { mobile: 3, tablet: 3, desktop: 4 };

export default function LayoutSettings() {
  const [v, setV] = useState<GridCols>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "grid_columns").maybeSingle()
      .then(({ data }) => {
        if (data?.value) setV({ ...DEFAULTS, ...(data.value as any) });
        setLoading(false);
      });
  }, []);

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

  const save = async () => {
    setSaving(true);
    const value = {
      mobile: clamp(v.mobile, 2, 4),
      tablet: clamp(v.tablet, 2, 6),
      desktop: clamp(v.desktop, 2, 8),
    };
    const { error } = await supabase.from("app_settings").upsert({ key: "grid_columns", value });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Layout settings saved");
    qc.invalidateQueries({ queryKey: ["app_settings", "grid_columns"] });
  };

  if (loading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Layout Settings</h1>
        <p className="text-sm text-muted-foreground">Control how many products show per row across the customer app.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Products per row</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Mobile (2–4)" value={v.mobile} onChange={(n) => setV({ ...v, mobile: n })} min={2} max={4} />
          <Field label="Tablet (2–6)" value={v.tablet} onChange={(n) => setV({ ...v, tablet: n })} min={2} max={6} />
          <Field label="Desktop (2–8)" value={v.desktop} onChange={(n) => setV({ ...v, desktop: n })} min={2} max={8} />
        </CardContent>
      </Card>
      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>) : "Save settings"}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}