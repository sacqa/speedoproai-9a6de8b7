import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHomePicks, HOME_PICKS_DEFAULTS, type HomePicks } from "@/hooks/useHomePicks";
import { useCatalog } from "@/lib/shopAssistant";

const PLACEMENTS = [
  { v: "after_services", l: "Below service tiles" },
  { v: "after_banner", l: "Below hero banner" },
  { v: "after_categories", l: "Below product categories" },
  { v: "after_featured", l: "Below featured / hot products" },
  { v: "bottom", l: "Bottom of homepage" },
];

export function HomePicksCard() {
  const qc = useQueryClient();
  const { data } = useHomePicks();
  const { data: catalog = [] } = useCatalog();
  const [v, setV] = useState<HomePicks>(HOME_PICKS_DEFAULTS);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setV(data); }, [data]);

  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return catalog.filter((p) => !v.product_ids.includes(p.id) && p.name.toLowerCase().includes(t)).slice(0, 8);
  }, [q, catalog, v.product_ids]);

  const save = async () => {
    setSaving(true);
    const value = { ...v, title: v.title.trim().slice(0, 60) || "Picked for you" };
    const { error } = await supabase.from("app_settings").upsert({ key: "home_picks", value: value as any });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Picked for You saved");
    qc.invalidateQueries({ queryKey: ["app_settings", "home_picks"] });
  };

  return (
    <Card>
      <CardHeader><CardTitle>"Picked for You" section</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="hp-on">Show on homepage</Label>
          <Switch id="hp-on" checked={v.enabled} onCheckedChange={(enabled) => setV({ ...v, enabled })} />
        </div>
        <div>
          <Label className="mb-1.5 block">Section title</Label>
          <Input value={v.title} maxLength={60} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5 block">Placement</Label>
          <Select value={v.placement} onValueChange={(placement: any) => setV({ ...v, placement })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PLACEMENTS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Recommended products</Label>
          <p className="text-xs text-muted-foreground mb-2">Leave empty to show automatic picks. Out-of-stock items are hidden automatically.</p>
          <Input placeholder="Search a product to add…" value={q} onChange={(e) => setQ(e.target.value)} />
          {matches.length > 0 && (
            <div className="mt-1 border rounded-md divide-y max-h-56 overflow-auto">
              {matches.map((p) => (
                <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between"
                  onClick={() => { setV({ ...v, product_ids: [...v.product_ids, p.id] }); setQ(""); }}>
                  <span className="truncate">{p.name}</span><span className="text-muted-foreground">Rs {p.price}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {v.product_ids.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                {byId.get(id)?.name ?? "Unavailable item"}
                <button type="button" aria-label="Remove" onClick={() => setV({ ...v, product_ids: v.product_ids.filter((x) => x !== id) })}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save section"}
        </Button>
      </CardContent>
    </Card>
  );
}
