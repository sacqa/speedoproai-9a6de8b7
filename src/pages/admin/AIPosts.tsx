import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Copy, Download, Wand2 } from "lucide-react";
import { toast } from "sonner";

const POST_KINDS = [
  { id: "sale", label: "Flash Sale" },
  { id: "feature", label: "Feature Spotlight" },
  { id: "festival", label: "Festival / Eid" },
  { id: "newProduct", label: "New Product" },
  { id: "delivery", label: "Fast Delivery" },
  { id: "testimonial", label: "Customer Love" },
] as const;
const VIBES = ["Bold", "Playful", "Premium", "Minimal", "Festive", "Witty"];
const PLATFORMS = [
  { id: "instagram", label: "Instagram (1:1)" },
  { id: "story", label: "Story / Reel (9:16)" },
  { id: "facebook", label: "Facebook (16:10)" },
] as const;

type Post = { imageUrl: string; caption: string; hashtags: string[]; headline: string };

export default function AIPosts() {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<(typeof POST_KINDS)[number]["id"]>("sale");
  const [vibe, setVibe] = useState("Bold");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("instagram");
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Post[]>([]);

  const generate = async () => {
    if (!topic.trim()) return toast.error("Enter a topic, e.g. 'Mango season 30% off'");
    setBusy(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-post", {
        body: { topic: topic.trim(), kind, vibe, platform, count },
      });
      if (error) throw error;
      setResults((data?.posts ?? []) as Post[]);
      toast.success(`Generated ${data?.posts?.length ?? 0} post${(data?.posts?.length ?? 0) > 1 ? "s" : ""}`);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("429")) toast.error("Rate limit — please retry shortly");
      else if (msg.includes("402")) toast.error("AI credits exhausted — please top up");
      else toast.error(msg || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };
  const download = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url; a.download = name; a.target = "_blank"; a.rel = "noopener"; a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><Wand2 className="h-6 w-6 text-primary" /> AI Promo Posts</h1>
        <p className="text-sm text-muted-foreground">Generate scroll-stopping social posts to share and attract customers.</p>
      </div>

      <Card className="glass-sheet border-white/60">
        <CardHeader><CardTitle className="text-base">Compose a post</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>What's the post about?</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Mango season — 30% off Sindhri mangoes, free delivery in Dipalpur"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="mb-1.5 block">Post type</Label>
              <div className="flex flex-wrap gap-1.5">
                {POST_KINDS.map((k) => (
                  <Chip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Vibe</Label>
              <div className="flex flex-wrap gap-1.5">
                {VIBES.map((v) => (
                  <Chip key={v} active={vibe === v} onClick={() => setVibe(v)}>{v}</Chip>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Platform</Label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <Chip key={p.id} active={platform === p.id} onClick={() => setPlatform(p.id)}>{p.label}</Chip>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">How many variants?</Label>
            <div className="grid grid-cols-6 gap-1.5 max-w-md">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                    count === n ? "bg-primary text-primary-foreground border-primary" : "bg-white/60 border-white/60 text-foreground/80 hover:bg-white"
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={busy} size="lg" className="w-full sm:w-auto">
            {busy
              ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating {count > 1 ? `${count} posts…` : "…"}</>)
              : (<><Sparkles className="h-4 w-4 mr-2" />Generate {count > 1 ? `${count} posts` : "post"}</>)}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((r, i) => (
            <Card key={i} className="overflow-hidden glass-sheet border-white/60">
              <div className="relative bg-muted">
                <img src={r.imageUrl} alt={r.headline} className="w-full aspect-square object-cover" />
              </div>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-extrabold leading-tight">{r.headline}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{r.caption}</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.hashtags.map((h, idx) => (
                    <span key={idx} className="text-[11px] bg-primary/10 text-primary font-semibold rounded-full px-2 py-0.5">#{h.replace(/^#/, "")}</span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => copy(`${r.headline}\n\n${r.caption}\n\n${r.hashtags.map((h) => "#" + h.replace(/^#/, "")).join(" ")}`)}>
                    <Copy className="h-4 w-4 mr-1" /> Copy text
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => download(r.imageUrl, `speedo-post-${Date.now()}-${i}.png`)}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-full font-semibold border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-white/60 border-white/60 text-foreground/80 hover:bg-white"
      }`}
    >{children}</button>
  );
}