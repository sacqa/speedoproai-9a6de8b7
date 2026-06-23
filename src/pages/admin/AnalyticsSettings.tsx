import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, BarChart3, Activity, ExternalLink } from "lucide-react";

type Settings = { ga4_measurement_id?: string; clarity_project_id?: string };

export default function AdminAnalyticsSettings() {
  const [v, setV] = useState<Settings>({ ga4_measurement_id: "", clarity_project_id: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "analytics").maybeSingle()
      .then(({ data }) => { if (data?.value) setV(data.value as Settings); });
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").upsert({
      key: "analytics",
      value: v as any,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Analytics updated — live for all users");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Connect Google Analytics 4 (user journeys, page views, behavior) and Microsoft Clarity (free heatmaps & session replay). Changes apply instantly — no redeploy needed.
        </p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <Label htmlFor="ga">Google Analytics 4 — Measurement ID</Label>
            <Input
              id="ga"
              placeholder="G-XXXXXXXXXX"
              value={v.ga4_measurement_id ?? ""}
              onChange={(e) => setV({ ...v, ga4_measurement_id: e.target.value.trim() })}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Get yours at{" "}
              <a href="https://analytics.google.com" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5">
                analytics.google.com <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              → Admin → Data Streams → Web. Tracks page views, user journeys, behavior and conversions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 border-t border-accent/40 pt-4">
          <div className="h-10 w-10 rounded-xl bg-orange/15 flex items-center justify-center text-orange shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <Label htmlFor="cl">Microsoft Clarity — Project ID</Label>
            <Input
              id="cl"
              placeholder="abcd1234ef"
              value={v.clarity_project_id ?? ""}
              onChange={(e) => setV({ ...v, clarity_project_id: e.target.value.trim() })}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Get yours at{" "}
              <a href="https://clarity.microsoft.com" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5">
                clarity.microsoft.com <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              → Settings → Setup. Free unlimited heatmaps and session recordings.
            </p>
          </div>
        </div>

        <Button onClick={save} disabled={busy} className="gap-1">
          <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save & apply live"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: Heatmaps and session replays show real user clicks, scrolls and rage-clicks — perfect for spotting UI confusion. Both tools are free.
      </p>
    </div>
  );
}