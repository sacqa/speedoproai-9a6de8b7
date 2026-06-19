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

    // ---------- 1) Generate copy with Gemini, auto-fallback across models ----------
    const COPY_MODELS = [
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-flash",
      "openai/gpt-5-mini",
    ];
    let variants: any[] = [];
    const copyAttempts: string[] = [];
    let lastCopyStatus = 0;
    let lastCopyBody = "";
    for (const model of COPY_MODELS) {
      console.log(`[generate-post] copy attempt model=${model}`);
      const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      lastCopyStatus = chatRes.status;
      if (!chatRes.ok) {
        lastCopyBody = await chatRes.text();
        copyAttempts.push(`${model} → ${chatRes.status} ${lastCopyBody.slice(0, 220)}`);
        console.warn(`[generate-post] copy fail ${model}`, chatRes.status, lastCopyBody.slice(0, 500));
        // Hard-stop on auth/billing — fallback won't help.
        if (chatRes.status === 402) {
          return json({ error: "AI credits exhausted. Top up Lovable AI credits to continue.", attempts: copyAttempts }, 402);
        }
        if (chatRes.status === 401 || chatRes.status === 403) {
          return json({ error: `AI auth failed (${chatRes.status}). Check LOVABLE_API_KEY.`, attempts: copyAttempts }, 500);
        }
        continue;
      }
      const chatJson = await chatRes.json();
      try {
        const txt = chatJson?.choices?.[0]?.message?.content ?? "{}";
        const payload = typeof txt === "string" ? JSON.parse(txt) : txt;
        const arr = Array.isArray(payload?.posts) ? payload.posts.slice(0, count) : [];
        if (arr.length) { variants = arr; break; }
        copyAttempts.push(`${model} → 200 but no posts in payload`);
      } catch (e) {
        copyAttempts.push(`${model} → 200 but JSON parse failed: ${(e as Error).message}`);
      }
    }
    if (!variants.length) {
      return json({
        error: "AI failed to generate post copy after all fallbacks.",
        lastStatus: lastCopyStatus,
        attempts: copyAttempts,
      }, lastCopyStatus === 429 ? 429 : 500);
    }

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

      const imageAttempts: { model: string; status: number; body: string }[] = [];
      const tryImage = async (init: RequestInit) => {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", init);
        if (!r.ok) {
          const body = await r.text();
          return { ok: false as const, status: r.status, body, json: null as any };
        }
        return { ok: true as const, status: r.status, body: "", json: await r.json() };
      };

      // 1st: OpenAI gpt-image-2
      let imgResult = await tryImage({
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-image-2", prompt: visual, size, quality: "low", n: 1 }),
      });
      if (!imgResult.ok) {
        imageAttempts.push({ model: "openai/gpt-image-2", status: imgResult.status, body: imgResult.body.slice(0, 220) });
        console.warn(`[generate-post] image#${i} openai fail`, imgResult.status, imgResult.body.slice(0, 500));
      }

      // 2nd: Gemini 3.1 flash image
      if (!imgResult.ok && imgResult.status !== 402) {
        imgResult = await tryImage({
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: visual }],
            modalities: ["image", "text"],
          }),
        });
        if (!imgResult.ok) {
          imageAttempts.push({ model: "google/gemini-3.1-flash-image-preview", status: imgResult.status, body: imgResult.body.slice(0, 220) });
          console.warn(`[generate-post] image#${i} gemini-3.1 fail`, imgResult.status, imgResult.body.slice(0, 500));
        }
      }

      // 3rd: Gemini 2.5 flash image (Nano Banana)
      if (!imgResult.ok && imgResult.status !== 402) {
        imgResult = await tryImage({
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: visual }],
            modalities: ["image", "text"],
          }),
        });
        if (!imgResult.ok) {
          imageAttempts.push({ model: "google/gemini-2.5-flash-image", status: imgResult.status, body: imgResult.body.slice(0, 220) });
        }
      }

      if (!imgResult.ok) {
        const code = imgResult.status === 402 ? 402 : imgResult.status === 429 ? 429 : 500;
        return json({
          error: `AI image failed after ${imageAttempts.length} fallbacks (variant ${i + 1}/${variants.length})`,
          attempts: imageAttempts,
          copyAttempts,
        }, code);
      }
      const imgJson = imgResult.json;
      const b64 = imgJson?.data?.[0]?.b64_json;
      if (!b64) return json({ error: "No image returned (empty b64_json)", attempts: imageAttempts }, 500);
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