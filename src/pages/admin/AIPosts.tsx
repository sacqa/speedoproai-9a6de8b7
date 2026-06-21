import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Copy, Download, Wand2, Eye, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const generate = async () => {
    if (!topic.trim()) return toast.error("Enter a topic, e.g. 'Mango season 30% off'");
    setBusy(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-post", {
        body: { topic: topic.trim(), kind, vibe, platform, count },
      });
      // supabase-js swallows non-2xx bodies into a generic error; read the Response ourselves.
      if (error) {
        let status = 0;
        let serverMsg = "";
        const res: Response | undefined = (error as any)?.context;
        if (res && typeof res.json === "function") {
          status = res.status;
          try {
            const body = await res.clone().json();
            serverMsg = body?.error || body?.message || JSON.stringify(body);
          } catch {
            try { serverMsg = await res.clone().text(); } catch {}
          }
        }
        if (status === 429) {
          toast.error("Free provider is busy — please wait a few seconds and retry.");
        } else {
          toast.error(serverMsg || error.message || "Free generation failed", { duration: 8000 });
        }
        console.error("generate-post failed", { status, serverMsg, error });
        return;
      }
      setResults((data?.posts ?? []) as Post[]);
      toast.success(`Generated ${data?.posts?.length ?? 0} post${(data?.posts?.length ?? 0) > 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(String(e?.message ?? "Generation failed"));
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
                <button
                  onClick={() => setPreviewIndex(i)}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-bold bg-black/70 text-white rounded-full px-2.5 py-1 backdrop-blur hover:bg-black"
                >
                  <Eye className="h-3.5 w-3.5" /> Live preview
                </button>
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
                  <Button size="sm" onClick={() => setPreviewIndex(i)}>
                    <Eye className="h-4 w-4 mr-1" /> Preview
                  </Button>
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

      <Dialog open={previewIndex !== null} onOpenChange={(v) => !v && setPreviewIndex(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden glass-sheet border-white/60">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base">Live preview · {platform === "facebook" ? "Facebook" : platform === "story" ? "Story / Reel" : "Instagram"}</DialogTitle>
          </DialogHeader>
          {previewIndex !== null && results[previewIndex] && (
            <PlatformPreview post={results[previewIndex]} platform={platform} />
          )}
          {previewIndex !== null && results[previewIndex] && (
            <div className="p-3 flex gap-2 border-t border-white/40">
              <Button size="sm" className="flex-1" onClick={() => copy(`${results[previewIndex]!.headline}\n\n${results[previewIndex]!.caption}\n\n${results[previewIndex]!.hashtags.map((h) => "#" + h.replace(/^#/, "")).join(" ")}`)}>
                <Copy className="h-4 w-4 mr-1" /> Copy text
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => download(results[previewIndex]!.imageUrl, `speedo-post-${Date.now()}.png`)}>
                <Download className="h-4 w-4 mr-1" /> Download image
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlatformPreview({ post, platform }: { post: Post; platform: string }) {
  const aspect = platform === "story" ? "aspect-[9/16]" : platform === "facebook" ? "aspect-[16/10]" : "aspect-square";
  return (
    <div className="bg-background">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3">
        <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-white font-extrabold text-sm">S</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight">speedo.dipalpur</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Sponsored · Dipalpur</div>
        </div>
        <span className="text-muted-foreground text-lg leading-none">···</span>
      </div>
      {/* Image */}
      <div className={`relative bg-muted ${aspect} overflow-hidden`}>
        <img src={post.imageUrl} alt={post.headline} className="w-full h-full object-cover" />
      </div>
      {/* Action row */}
      <div className="px-3 pt-2.5 flex items-center gap-4">
        <Heart className="h-6 w-6" strokeWidth={1.8} />
        <MessageCircle className="h-6 w-6" strokeWidth={1.8} />
        <Send className="h-6 w-6" strokeWidth={1.8} />
        <Bookmark className="h-6 w-6 ml-auto" strokeWidth={1.8} />
      </div>
      {/* Caption */}
      <div className="px-3 py-2 space-y-1">
        <div className="font-extrabold text-sm leading-snug">{post.headline}</div>
        <p className="text-sm leading-snug whitespace-pre-wrap">
          <span className="font-bold mr-1.5">speedo.dipalpur</span>
          {post.caption}
        </p>
        <p className="text-xs text-primary leading-snug">
          {post.hashtags.map((h) => "#" + h.replace(/^#/, "")).join(" ")}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide pt-1">Just now</p>
      </div>
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