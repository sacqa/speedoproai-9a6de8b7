import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, Upload } from "lucide-react";

type Row = {
  id: string; title: string; message: string; image_url: string | null;
  cta_label: string | null; cta_url: string | null;
  is_active: boolean; expires_at: string | null; created_at: string;
};

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", message: "", image_url: "", cta_label: "", cta_url: "",
    expires_at: "",
  });

  const load = async () => {
    const { data } = await supabase.from("announcements")
      .select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    const path = `announce-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    toast.success("Image uploaded");
  };

  const create = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error("Title & message required");
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: form.title, message: form.message,
      image_url: form.image_url || null,
      cta_label: form.cta_label || null,
      cta_url: form.cta_url || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      created_by: user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Announcement published");
    setForm({ title: "", message: "", image_url: "", cta_label: "", cta_url: "", expires_at: "" });
    load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from("announcements").update({ is_active }).eq("id", id);
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold">Popup Announcements</h1>
        <p className="text-sm text-muted-foreground">In-app popups with image, message and a call-to-action.</p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Title</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Message</label>
          <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={400} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Image</label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background text-sm font-semibold hover:bg-muted">
              <Upload className="h-4 w-4" /> Upload
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {form.image_url && <img src={form.image_url} className="h-12 w-20 object-cover rounded" />}
          </div>
          <Input placeholder="…or paste image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold">CTA label (optional)</label>
            <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Learn more" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">CTA link (page or URL)</label>
            <Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="/speedmart or https://…" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Expires at (optional)</label>
          <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </div>
        <Button onClick={create} disabled={busy} className="w-full h-12 rounded-pill">
          {busy ? "Publishing..." : "Publish announcement"}
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-bold">All announcements</h2>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {rows.map((r) => {
          const expired = r.expires_at && new Date(r.expires_at) < new Date();
          return (
            <div key={r.id} className="bg-card rounded-xl shadow-card p-4 flex gap-3">
              {r.image_url && <img src={r.image_url} className="h-16 w-24 object-cover rounded shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold truncate">{r.title}</div>
                  {expired && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded">Expired</span>}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">{r.message}</div>
                {r.cta_url && <div className="text-[11px] text-primary mt-1">→ {r.cta_label || "Open"} ({r.cta_url})</div>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Switch checked={r.is_active} onCheckedChange={(v) => toggle(r.id, v)} />
                <button onClick={() => del(r.id)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}