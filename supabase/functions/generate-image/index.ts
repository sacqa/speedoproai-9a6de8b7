import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIZES: Record<string, { w: number; h: number }> = {
  square: { w: 1024, h: 1024 },
  banner: { w: 1536, h: 768 },
  hero_banner: { w: 1536, h: 768 },
  landscape: { w: 1536, h: 1024 },
  portrait: { w: 1024, h: 1536 },
};

// Two providers, both free for the admin:
//   1. Pollinations.ai      → no API key required, unlimited.
//   2. Lovable AI Gateway   → uses the project's LOVABLE_API_KEY.
//      - "gpt-2"          → openai/gpt-image-2
//      - "gemini-latest"  → google/gemini-3.1-flash-image (Nano Banana 2)
// Pollinations model mapping:
const MODEL_MAP: Record<string, string> = {
  "gpt-image-2": "flux",
  "gpt-image-1-mini": "turbo",
  "nano-banana": "flux-realism",
  flux: "flux",
  turbo: "turbo",
  "flux-realism": "flux-realism",
};

// Models routed through the Lovable AI Gateway (require LOVABLE_API_KEY).
const GATEWAY_MODELS: Record<string, { upstream: string; provider: "openai" | "gemini" }> = {
  "gpt-2": { upstream: "openai/gpt-image-2", provider: "openai" },
  "gemini-latest": { upstream: "google/gemini-3.1-flash-image", provider: "gemini" },
};

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
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supaUrl, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { prompt, preset = "square", bucket = "products", context, style = "vibrant", model = "gpt-image-2" } = body;
    const count = Math.max(1, Math.min(6, Number(body.count ?? 1)));
    if (!prompt || typeof prompt !== "string") return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const size = SIZES[preset] ?? SIZES.square;
    const polliModel = MODEL_MAP[model] ?? "flux";
    const gatewayModel = GATEWAY_MODELS[model];
    const allowedBuckets = new Set(["products", "banners", "food", "avatars"]);
    if (!allowedBuckets.has(bucket)) {
      return new Response(JSON.stringify({ error: "Invalid storage bucket" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ----- Creative prompt engineering -----
    const STYLE_MODIFIERS: Record<string, string> = {
      studio: "ultra-detailed studio product photography, crisp focus, soft diffused 3-point lighting, shallow depth of field, glossy reflections, photorealistic 8K, award-winning commercial shot",
      cinematic: "cinematic editorial photography, dramatic rim lighting, volumetric haze, rich shadows, color-graded teal-and-orange, film grain, anamorphic lens flares, hyper-detailed",
      lifestyle: "lifestyle photography, warm golden hour light, authentic candid mood, soft bokeh background, real-world environment, magazine-quality composition",
      minimal: "minimalist art direction, lots of negative space, pastel solid background, single subject, balanced geometric composition, modern editorial",
      vibrant: "vibrant saturated colors, playful gradient background, glossy 3D-render feel, energetic composition, contemporary advertising aesthetic, eye-popping",
      luxury: "luxury premium photography, marble and gold accents, deep velvety shadows, jewel-tone palette, opulent textures, high-end magazine cover quality",
      social_post: "scroll-stopping social media post visual, bold gradient backdrop, dynamic composition with leading lines, plenty of clean negative space for headline text, Instagram-worthy, mobile-first 9:16 framing energy",
    };
    const modifier = STYLE_MODIFIERS[style] ?? STYLE_MODIFIERS.vibrant;

    let styled = prompt;
    if (context === "product") {
      styled = `Hero product photography of "${prompt}". ${modifier}. Centered subject, immaculate clean background, no logos, no watermarks, no text. Sharpened edges, true-to-life colors, premium e-commerce hero shot.`;
    } else if (context === "category") {
      styled = `A premium app category illustration representing "${prompt}". ${modifier}. Flat-meets-3D look, soft gradient background, single iconic object, friendly modern art direction, no text, no logos.`;
    } else if (context === "banner") {
      styled = `Striking full-bleed promotional hero banner: "${prompt}". ${modifier}. Edge-to-edge composition that fills the entire 2:1 frame, cinematic subject placement, generous negative space on the left third for headline text, glowing accents, modern advertising aesthetic, no text or letters anywhere in the image.`;
    } else {
      styled = `${prompt}. ${modifier}. No text or letters, no watermarks, no logos.`;
    }

    // ---- Lovable AI Gateway path (gpt-2 / gemini-latest) ----
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    const generateViaGateway = async (idx: number): Promise<{ buf: Uint8Array; contentType: string } | null> => {
      if (!gatewayModel || !LOVABLE_KEY) return null;
      const variantHint =
        idx === 0 ? styled : `${styled} Variant ${idx + 1}: alternate angle, fresh composition, different lighting mood.`;
      const sizeStr = `${size.w}x${size.h}`;
      const reqBody = gatewayModel.provider === "openai"
        ? { model: gatewayModel.upstream, prompt: variantHint, size: sizeStr, quality: "low", n: 1 }
        : { model: gatewayModel.upstream, messages: [{ role: "user", content: variantHint }], modalities: ["image", "text"] };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 90_000);
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.warn(`[generate-image] gateway ${gatewayModel.upstream} failed ${res.status}: ${t.slice(0, 200)}`);
          return null;
        }
        const json = await res.json();
        const b64 = json?.data?.[0]?.b64_json;
        if (!b64) return null;
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return { buf: bin, contentType: "image/png" };
      } catch (e) {
        console.warn(`[generate-image] gateway error: ${(e as Error).message}`);
        return null;
      } finally {
        clearTimeout(timer);
      }
    };

    // ---- Pollinations.ai: free, unlimited, no key required ----
    const generateOne = async (idx: number): Promise<string> => {
      // 1) Try the Lovable Gateway path first for gpt-2 / gemini-latest.
      const attempts: string[] = [];
      let buf: Uint8Array | null = null;
      let contentType = "image/jpeg";
      let resolvedModel = gatewayModel?.upstream ?? polliModel;

      if (gatewayModel) {
        const gw = await generateViaGateway(idx);
        if (gw) {
          buf = gw.buf;
          contentType = gw.contentType;
        } else {
          attempts.push(`${gatewayModel.upstream}: gateway unavailable, falling back to free provider`);
        }
      }

      // 2) Pollinations free fallback (always available).
      const seed = Math.floor(Math.random() * 1_000_000_000) + idx;
      const variantHint =
        idx === 0 ? styled : `${styled} Variant ${idx + 1}: alternate angle, fresh composition, different lighting mood.`;
      const polliCandidates = unique([polliModel, "flux", "flux-realism", "turbo"]);
      for (const providerModel of (buf ? [] : polliCandidates)) {
        const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(variantHint)}`);
        url.searchParams.set("width", String(size.w));
        url.searchParams.set("height", String(size.h));
        url.searchParams.set("model", providerModel);
        url.searchParams.set("seed", String(seed));
        url.searchParams.set("nologo", "true");
        url.searchParams.set("enhance", "true");

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 70_000);
        try {
          const res = await fetch(url.toString(), {
            signal: ctrl.signal,
            headers: { "User-Agent": "SpeedoAdminImageGenerator/1.0", Accept: "image/*" },
          });
          if (!res.ok) {
            const t = await res.text().catch(() => "");
            attempts.push(`${providerModel}: HTTP ${res.status} ${t.slice(0, 160)}`);
            continue;
          }
          const next = new Uint8Array(await res.arrayBuffer());
          if (next.byteLength < 1000) {
            attempts.push(`${providerModel}: empty image response`);
            continue;
          }
          buf = next;
          contentType = res.headers.get("content-type")?.split(";")[0] || contentType;
          resolvedModel = providerModel;
          break;
        } catch (e) {
          attempts.push(`${providerModel}: ${(e as Error).message}`);
        } finally {
          clearTimeout(timer);
        }
      }
      if (!buf) {
        throw new Response(JSON.stringify({ error: "Image generation failed across all providers. Please retry.", attempts }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const path = `ai/${Date.now()}-${idx}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await admin.storage
        .from(bucket)
        .upload(path, buf, { contentType, upsert: true });
      if (upErr) {
        throw new Response(JSON.stringify({ error: upErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
      console.log(`[generate-image] generated idx=${idx} model=${resolvedModel} size=${size.w}x${size.h} bucket=${bucket}`);
      return pub.publicUrl;
    };

    try {
      const urls = await Promise.all(Array.from({ length: count }, (_, i) => generateOne(i)));
      return new Response(
        JSON.stringify({
          url: urls[0],
          urls,
          model: gatewayModel?.upstream ?? polliModel,
          provider: gatewayModel ? "lovable-gateway" : "pollinations-free",
          size,
          unlimited: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (resp) {
      if (resp instanceof Response) return resp;
      throw resp;
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});