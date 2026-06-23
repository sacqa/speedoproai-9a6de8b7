import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const SLUGS = ["about", "contact", "careers", "privacy", "terms"] as const;
type Slug = typeof SLUGS[number];
const LABELS: Record<Slug, string> = {
  about: "About",
  contact: "Contact",
  careers: "Careers",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};

type Page = {
  id?: string;
  slug: Slug;
  title: string;
  subtitle?: string | null;
  hero_image_url?: string | null;
  content: string;
  meta_description?: string | null;
  is_published: boolean;
};

export default function AdminPages() {
  const [tab, setTab] = useState<Slug>("about");
  const qc = useQueryClient();
  const { data: pages = [], refetch } = useQuery({
    queryKey: ["admin", "cms_pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cms_pages" as any).select("*").in("slug", SLUGS as unknown as string[]);
      if (error) throw error;
      return (data ?? []) as unknown as Page[];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Pages</h1>
        <p className="text-sm text-muted-foreground">Edit About, Contact, Careers, Privacy and Terms. Changes appear for users instantly.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Slug)}>
        <TabsList className="flex flex-wrap h-auto">
          {SLUGS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs sm:text-sm">{LABELS[s]}</TabsTrigger>
          ))}
        </TabsList>

        {SLUGS.map((s) => {
          const existing = pages.find((p) => p.slug === s);
          return (
            <TabsContent key={s} value={s} className="mt-4">
              <PageEditor
                slug={s}
                initial={existing}
                onSaved={() => { qc.invalidateQueries({ queryKey: ["admin", "cms_pages"] }); refetch(); }}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function PageEditor({ slug, initial, onSaved }: { slug: Slug; initial?: Page; onSaved: () => void }) {
  const [p, setP] = useState<Page>(initial ?? {
    slug, title: LABELS[slug], subtitle: "", hero_image_url: "", content: "", meta_description: "", is_published: true,
  });
  useEffect(() => {
    if (initial) setP(initial);
  }, [initial?.id]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!p.title?.trim() || !p.content?.trim()) return toast.error("Title and content required");
    setBusy(true);
    const payload = { ...p, slug };
    const op = p.id
      ? supabase.from("cms_pages" as any).update(payload as any).eq("id", p.id)
      : supabase.from("cms_pages" as any).insert(payload as any);
    const { error } = await op;
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${LABELS[slug]} saved — live now`);
    onSaved();
  };

  const upload = async (file: File) => {
    const path = `cms/${slug}-${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setP((s) => ({ ...s, hero_image_url: data.publicUrl }));
  };

  return (
    <div className="bg-card rounded-xl shadow-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={p.is_published} onCheckedChange={(v) => setP({ ...p, is_published: v })} />
          Published
        </label>
        <Link to={`/${slug}`} target="_blank" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
          View live <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Title</Label><Input value={p.title ?? ""} onChange={(e) => setP({ ...p, title: e.target.value })} /></div>
        <div><Label>Subtitle</Label><Input value={p.subtitle ?? ""} onChange={(e) => setP({ ...p, subtitle: e.target.value })} /></div>
      </div>
      <div>
        <Label>Hero image (optional)</Label>
        <div className="flex items-center gap-2">
          {p.hero_image_url && <img src={p.hero_image_url} alt="" className="h-12 w-24 rounded object-cover border border-accent/40" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>
      <div>
        <Label>Meta description (SEO)</Label>
        <Input value={p.meta_description ?? ""} onChange={(e) => setP({ ...p, meta_description: e.target.value })} maxLength={160} />
      </div>
      <div>
        <Label>Content (Markdown supported — use ## for headings, - for lists, **bold**, [text](url))</Label>
        <Textarea
          value={p.content ?? ""}
          onChange={(e) => setP({ ...p, content: e.target.value })}
          className="min-h-[320px] font-mono text-sm"
        />
      </div>
      <Button onClick={save} disabled={busy} className="gap-1">
        <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save & publish"}
      </Button>
    </div>
  );
}