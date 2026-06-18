import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIZES: Record<string, string> = {
  instagram: "1024x1024",
  story: "1024x1536",
  facebook: "1536x1024",
};

type Post = { imageUrl: string; caption: string; hashtags: string[]; headline: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

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

    // ---------- 1) Generate copy with Gemini (single call, structured JSON) ----------
    const kindHint: Record<string, string> = {
      sale: "Punchy flash-sale energy with urgency and a clear discount call-out.",
      feature: "Spotlight a feature/service of Speedo with confident benefit-driven copy.",
      festival: "Warm festive tone tying the offer to the season (Eid, Ramadan, Independence, etc.).",
      newProduct: "Excited launch announcement with curiosity and a strong hook.",
      delivery: "Fast, hyperlocal delivery promise in Dipalpur — convenience-first.",
      testimonial: "Customer-love angle, social proof, friendly conversational tone.",
    };

    const sys = `You are a world-class social media creative director writing for "Speedo" — a hyperlocal delivery app in Dipalpur, Pakistan (groceries, food, pharmacy, parcels).
Write like a top-performing 2026 brand account: punchy hooks, current internet voice, light wit, culturally aware (Pakistan / Punjab / Urdu-English mix is welcome where it lands).
Avoid clichés ("Hurry up!", "Don't miss out!", "Limited time only!", generic emojis spam). Use specific, vivid, sensory language. Reference real behaviors (load shedding, chai breaks, cricket nights, school runs, monsoon, Friday biryani) when relevant.
Hashtags must be a mix of broad (#Pakistan #Dipalpur #Lahore) and niche (#DipalpurEats #SpeedoFast). Lowercase, no leading #.
Always return STRICT JSON only — no markdown, no commentary.`;
    const userPrompt = `Generate ${count} DISTINCT, creative social post variants. Each variant must feel different in angle, hook style, and emotion — never repeat the same opener twice.

Topic: "${topic}"
Post type: ${kind} — ${kindHint[kind] ?? ""}
Vibe: ${vibe}
Platform: ${platform}

Return JSON of shape:
{ "posts": [ { "headline": string (max 60 chars, scroll-stopping hook — question, bold claim, or surprising stat),
              "caption": string (3-5 short lines with line breaks, conversational, 1-3 tasteful emoji max, no @mentions, ends with a soft CTA),
              "hashtags": string[] (8-12 tags, lowercase, no leading #, mix broad + niche + local),
              "imagePrompt": string (a rich, visually-detailed prompt for an AI image model — DO NOT include any text/letters in the visual; describe subject, lighting, palette, composition, mood, lens; include "no text, no logos, no watermarks") } ] }
No commentary. JSON only.`;

    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!chatRes.ok) {
      const t = await chatRes.text();
      const code = chatRes.status === 402 || chatRes.status === 429 ? chatRes.status : 500;
      return json({ error: `AI copy failed: ${chatRes.status} ${t}` }, code);
    }
    const chatJson = await chatRes.json();
    let payload: any;
    try {
      const txt = chatJson?.choices?.[0]?.message?.content ?? "{}";
      payload = typeof txt === "string" ? JSON.parse(txt) : txt;
    } catch {
      payload = { posts: [] };
    }
    const variants: any[] = Array.isArray(payload?.posts) ? payload.posts.slice(0, count) : [];
    if (!variants.length) return json({ error: "AI returned no variants" }, 500);

    // ---------- 2) Generate one image per variant ----------
    const VIBE_STYLE: Record<string, string> = {
      Bold: "high-contrast, electric colors, dramatic lighting, oversized hero subject",
      Playful: "bubbly 3D-render aesthetic, candy colors, kinetic shapes, joyful",
      Premium: "luxury editorial, velvety shadows, jewel-tones, gold accents",
      Minimal: "clean editorial, lots of negative space, single subject, pastel backdrop",
      Festive: "warm festive lighting, marigold/teal palette, bokeh lanterns, cultural cues",
      Witty: "playful surreal composition, unexpected scale, conceptual visual pun",
    };

    const posts: Post[] = [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const visual = `Scroll-stopping social media post visual. ${VIBE_STYLE[vibe] ?? VIBE_STYLE.Bold}. ${v.imagePrompt ?? topic}. Sharp focus, photoreal where appropriate, generous negative space for overlay text, hyper-detailed, premium ad-campaign quality. STRICT: no text, no letters, no logos, no watermarks.`;
      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-image-2", prompt: visual, size, quality: "low", n: 1 }),
      });
      if (!imgRes.ok) {
        const t = await imgRes.text();
        const code = imgRes.status === 402 || imgRes.status === 429 ? imgRes.status : 500;
        return json({ error: `AI image failed: ${imgRes.status} ${t}` }, code);
      }
      const imgJson = await imgRes.json();
      const b64 = imgJson?.data?.[0]?.b64_json;
      if (!b64) return json({ error: "No image returned" }, 500);
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `posts/${Date.now()}-${i}-${crypto.randomUUID().slice(0, 8)}.png`;
      const { error: upErr } = await admin.storage.from("banners").upload(path, bin, { contentType: "image/png", upsert: true });
      if (upErr) return json({ error: upErr.message }, 500);
      const { data: pub } = admin.storage.from("banners").getPublicUrl(path);
      posts.push({
        imageUrl: pub.publicUrl,
        headline: String(v.headline ?? topic).slice(0, 120),
        caption: String(v.caption ?? ""),
        hashtags: Array.isArray(v.hashtags) ? v.hashtags.map((h: any) => String(h)).slice(0, 12) : [],
      });
    }

    return json({ posts });
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