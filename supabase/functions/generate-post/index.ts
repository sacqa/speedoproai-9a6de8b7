import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIZES: Record<string, { w: number; h: number }> = {
  instagram: { w: 1024, h: 1024 },
  story: { w: 1024, h: 1536 },
  facebook: { w: 1536, h: 1024 },
};

type Post = { imageUrl: string; caption: string; hashtags: string[]; headline: string };

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supaUrl, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const topic = String(body.topic ?? "").trim();
    const kind = String(body.kind ?? "sale");
    const vibe = String(body.vibe ?? "Bold");
    const platform = String(body.platform ?? "instagram") as keyof typeof SIZES;
    const count = Math.max(1, Math.min(6, Number(body.count ?? 1)));
    if (!topic) return json({ error: "topic required" }, 400);

    const size = SIZES[platform] ?? SIZES.instagram;

    // ---------- 1) Generate copy with a free provider ----------
    const kindHint: Record<string, string> = {
      sale: "Punchy flash-sale energy with urgency and a clear discount call-out.",
      feature: "Spotlight a feature/service of Speedo with confident benefit-driven copy.",
      festival: "Warm festive tone tying the offer to the season (Eid, Ramadan, Independence, etc.).",
      newProduct: "Excited launch announcement with curiosity and a strong hook.",
      delivery: "Fast, hyperlocal delivery promise in Dipalpur — convenience-first.",
      testimonial: "Customer-love angle, social proof, friendly conversational tone.",
    };

    const PLATFORM_SPEC: Record<string, string> = {
      instagram: "Instagram feed post. Lead with a 1-line HOOK (question, bold stat, or pattern interrupt). Then 3-5 punchy lines, each on its own line. Use 1-2 short bullet rows with • for benefits. End with a clear single CTA line. 1-3 tasteful emoji max. ~150 words max.",
      facebook: "Facebook post. Friendlier, slightly longer (5-7 short lines). Open with a hook, mid-section can include a tiny mini-story or 2-3 • bullets, close with a soft CTA + link prompt. 1-2 emoji.",
      story: "Instagram/Facebook Story. Ultra short and vertical-readable: a 4-7 word hook line, then 2-3 micro lines, then a swipe-style CTA (e.g. 'Tap to order →'). 1-2 emoji max.",
    };

    const sys = `You are a world-class social media creative director for "Speedo" — a hyperlocal delivery app in Dipalpur, Pakistan (groceries, food, pharmacy, parcels).
Write like a top-performing 2026 brand account: scroll-stopping hooks, current internet voice, light wit, culturally fluent (Pakistan / Punjab / Urdu-English code-switch welcome where it lands naturally — never forced).
Banned phrases & moves: "Hurry up", "Don't miss out", "Limited time only", "Act now", generic 🔥💯 spam, vague "amazing deals", any caps-locked shouting.
Use specific, vivid, sensory language. Reference real local behaviors when relevant (load shedding, chai breaks, cricket nights, school runs, monsoon, Friday biryani, Sunday cleaning, Eid prep, Ramadan iftar, exam season, mango season, electricity bill day).
Each variant must feel DIFFERENT — different hook archetype (question / bold claim / mini-story / surprising stat / contrarian take / observation / before-after), different emotional register, different opener word.
Hashtags: 8-12, lowercase, NO leading #, blend broad (pakistan, dipalpur, lahore, okara) + niche (dipalpureats, speedofast, hyperlocaldelivery) + intent (latenightcravings, grocerydelivery).
Always return STRICT JSON only — no markdown fence, no commentary, no trailing text.`;

    const userPrompt = `Generate ${count} DISTINCT, creative social post variants. Never reuse the same opening word or hook archetype twice.

Topic: "${topic}"
Post type: ${kind} — ${kindHint[kind] ?? ""}
Vibe: ${vibe}
Platform: ${platform}
Platform format spec: ${PLATFORM_SPEC[platform] ?? PLATFORM_SPEC.instagram}

Return JSON of shape:
{ "posts": [ {
    "headline": string (max 60 chars, scroll-stopping hook — question, bold claim, observation, or surprising stat. No emoji here.),
    "caption": string (formatted per the platform spec above. Use real line breaks (\\n). Include at least one bullet line starting with "• " when the platform spec allows it. End with one clear CTA line.),
    "hashtags": string[] (8-12 tags, lowercase, no leading #, mix broad + niche + local + intent),
    "imagePrompt": string (a rich, visually-detailed prompt for an AI image model — DO NOT include any text/letters/logos in the visual; describe subject, lighting, palette, composition, mood, lens, camera angle; end with "no text, no letters, no logos, no watermarks")
} ] }
No commentary. JSON only.`;

    // OpenAI-compatible endpoint. Try a few hosted models in order.
    const COPY_MODELS = ["openai-large", "openai", "mistral"];
    let variants: any[] = [];
    const copyAttempts: string[] = [];
    let lastCopyStatus = 0;
    for (const model of COPY_MODELS) {
      console.log(`[generate-post] copy attempt model=${model}`);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45_000);
      let chatRes: Response;
      try {
        chatRes = await fetch("https://text.pollinations.ai/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: sys },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            private: true,
            referrer: "speedo-app",
          }),
          signal: ctrl.signal,
        });
      } catch (e) {
        copyAttempts.push(`${model} → fetch error: ${(e as Error).message}`);
        continue;
      } finally {
        clearTimeout(t);
      }
      lastCopyStatus = chatRes.status;
      if (!chatRes.ok) {
        const body = await chatRes.text().catch(() => "");
        copyAttempts.push(`${model} → ${chatRes.status} ${body.slice(0, 200)}`);
        continue;
      }
      try {
        const chatJson = await chatRes.json();
        let txt = chatJson?.choices?.[0]?.message?.content ?? "{}";
        if (typeof txt !== "string") txt = JSON.stringify(txt);
        // Strip accidental code fences.
        txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
        const payload = JSON.parse(txt);
        const arr = Array.isArray(payload?.posts) ? payload.posts.slice(0, count) : [];
        if (arr.length) { variants = arr; break; }
        copyAttempts.push(`${model} → 200 but no posts in payload`);
      } catch (e) {
        copyAttempts.push(`${model} → JSON parse failed: ${(e as Error).message}`);
      }
    }
    if (!variants.length) {
      console.warn("[generate-post] copy provider failed; using local creative fallback", { lastCopyStatus, copyAttempts });
      variants = buildFallbackVariants(topic, kind, vibe, platform, count);
    }

    // ---------- 2) Generate one image per variant via Pollinations ----------
    const VIBE_STYLE: Record<string, string> = {
      Bold: "high-contrast, electric colors, dramatic lighting, oversized hero subject",
      Playful: "bubbly 3D-render aesthetic, candy colors, kinetic shapes, joyful",
      Premium: "luxury editorial, velvety shadows, jewel-tones, gold accents",
      Minimal: "clean editorial, lots of negative space, single subject, pastel backdrop",
      Festive: "warm festive lighting, marigold/teal palette, bokeh lanterns, cultural cues",
      Witty: "playful surreal composition, unexpected scale, conceptual visual pun",
    };

    const generateImage = async (visual: string, i: number): Promise<string> => {
      const seed = Math.floor(Math.random() * 1_000_000_000) + i;
      let buf: Uint8Array | null = null;
      let contentType = "image/jpeg";
      const attempts: string[] = [];
      for (const model of unique(["flux", "flux-realism", "turbo"])) {
        const u = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(visual)}`);
        u.searchParams.set("width", String(size.w));
        u.searchParams.set("height", String(size.h));
        u.searchParams.set("model", model);
        u.searchParams.set("seed", String(seed));
        u.searchParams.set("nologo", "true");
        u.searchParams.set("enhance", "true");
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 70_000);
        try {
          const r = await fetch(u.toString(), {
            signal: ctrl.signal,
            headers: { "User-Agent": "SpeedoAdminPostGenerator/1.0", Accept: "image/*" },
          });
          if (!r.ok) {
            const body = await r.text().catch(() => "");
            attempts.push(`${model}: HTTP ${r.status} ${body.slice(0, 160)}`);
            continue;
          }
          const next = new Uint8Array(await r.arrayBuffer());
          if (next.byteLength < 1000) {
            attempts.push(`${model}: empty image response`);
            continue;
          }
          buf = next;
          contentType = r.headers.get("content-type")?.split(";")[0] || contentType;
          console.log(`[generate-post] image#${i} generated model=${model}`);
          break;
        } catch (e) {
          attempts.push(`${model}: ${(e as Error).message}`);
        } finally { clearTimeout(t); }
      }
      if (!buf) throw new Error(`free image provider failed after fallbacks: ${attempts.join(" | ")}`);
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const path = `posts/${Date.now()}-${i}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await admin.storage.from("banners").upload(path, buf, { contentType, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = admin.storage.from("banners").getPublicUrl(path);
      return pub.publicUrl;
    };

    const posts: Post[] = [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const visual = `Scroll-stopping social media post visual. ${VIBE_STYLE[vibe] ?? VIBE_STYLE.Bold}. ${v.imagePrompt ?? topic}. Sharp focus, photoreal where appropriate, generous negative space for overlay text, hyper-detailed, premium ad-campaign quality. STRICT: no text, no letters, no logos, no watermarks.`;
      let imageUrl = "";
      try {
        imageUrl = await generateImage(visual, i);
      } catch (e) {
        console.warn(`[generate-post] image#${i} failed`, (e as Error).message);
        return json({
          error: `Image generation failed on variant ${i + 1}/${variants.length}. Free provider may be busy — please retry.`,
          detail: (e as Error).message,
        }, 502);
      }
      posts.push({
        imageUrl,
        headline: String(v.headline ?? topic).slice(0, 120),
        caption: String(v.caption ?? ""),
        hashtags: Array.isArray(v.hashtags) ? v.hashtags.map((h: any) => String(h)).slice(0, 12) : [],
      });
    }

    return json({ posts, provider: "pollinations-free", unlimited: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildFallbackVariants(topic: string, kind: string, vibe: string, platform: string, count: number) {
  const hooks = [
    `Your ${topic} plan just got easier`,
    `Dipalpur, this one is for today`,
    `Small errand, big time saved`,
    `The faster way to handle ${topic}`,
    `No extra trip needed`,
    `Make room in your day`,
  ];
  const ctas = platform === "story"
    ? ["Tap to order →", "Send your list now →", "Get it delivered today →"]
    : ["Order on Speedo today.", "Send your list — Speedo will handle the run.", "Tap, order, and get back to your day."];
  return Array.from({ length: count }, (_, i) => ({
    headline: hooks[i % hooks.length].slice(0, 60),
    caption: platform === "story"
      ? `${hooks[i % hooks.length]}\n• Fresh pick\n• Quick delivery\n${ctas[i % ctas.length]}`
      : `${hooks[i % hooks.length]}\n\n• Built for busy Dipalpur routines\n• Groceries, food, pharmacy and essentials without the extra ride\n• ${vibe} offer energy, clear value, zero fuss\n\n${ctas[i % ctas.length]}`,
    hashtags: ["speedo", "dipalpur", "pakistan", "hyperlocaldelivery", "grocerydelivery", "fooddelivery", "speedofast", "okara", "dailyessentials", kind.toLowerCase()].slice(0, 10),
    imagePrompt: `Premium ${vibe.toLowerCase()} social media advertising visual for ${topic}, hyperlocal delivery app in Dipalpur Pakistan, modern commercial photography, app-order convenience mood, clean composition, bright fresh colors, strong subject focus, mobile-first ad creative, no text, no letters, no logos, no watermarks`,
  }));
}