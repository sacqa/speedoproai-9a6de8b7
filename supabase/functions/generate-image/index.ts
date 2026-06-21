import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIZES: Record<string, { w: number; h: number }> = {
  square: { w: 1024, h: 1024 },
  banner: { w: 1536, h: 1024 },
  landscape: { w: 1536, h: 1024 },
  portrait: { w: 1024, h: 1536 },
};

// Pollinations.ai — free, unlimited, no API key required.
// Models exposed to the admin (named for marketing clarity):
//   - "gpt-image-2"      → flux        (highest quality general purpose)
//   - "gpt-image-1-mini" → turbo       (fastest, lower fidelity)
//   - "nano-banana"      → flux-realism (photoreal)
const MODEL_MAP: Record<string, string> = {
  "gpt-image-2": "flux",
  "gpt-image-1-mini": "turbo",
  "nano-banana": "flux-realism",
  flux: "flux",
  turbo: "turbo",
  "flux-realism": "flux-realism",
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
      styled = `Striking promotional banner concept: "${prompt}". ${modifier}. Strong subject on the right, generous empty negative space on the left for headline text, glowing accents, modern advertising aesthetic, no text or letters in the image.`;
    } else {
      styled = `${prompt}. ${modifier}. No text or letters, no watermarks, no logos.`;
    }

    // ---- Pollinations.ai: free, unlimited, no key required ----
    const generateOne = async (idx: number): Promise<string> => {
      const seed = Math.floor(Math.random() * 1_000_000_000) + idx;
      const variantHint =
        idx === 0 ? styled : `${styled} Variant ${idx + 1}: alternate angle, fresh composition, different lighting mood.`;
      const attempts: string[] = [];
      let buf: Uint8Array | null = null;
      let resolvedModel = polliModel;
      for (const providerModel of unique([polliModel, "flux", "flux-realism", "turbo"])) {
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
          const res = await fetch(url.toString(), { signal: ctrl.signal });
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
          resolvedModel = providerModel;
          break;
        } catch (e) {
          attempts.push(`${providerModel}: ${(e as Error).message}`);
        } finally {
          clearTimeout(timer);
        }
      }
      if (!buf) {
        throw new Response(JSON.stringify({ error: "Free image provider failed after fallback retries. Please retry.", attempts }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const path = `ai/${Date.now()}-${idx}-${crypto.randomUUID().slice(0, 8)}.png`;
      const { error: upErr } = await admin.storage
        .from(bucket)
        .upload(path, buf, { contentType: "image/png", upsert: true });
      if (upErr) {
        throw new Response(JSON.stringify({ error: upErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
      console.log(`[generate-image] generated idx=${idx} model=${resolvedModel} bucket=${bucket}`);
      return pub.publicUrl;
    };

    try {
      const urls = await Promise.all(Array.from({ length: count }, (_, i) => generateOne(i)));
      return new Response(
        JSON.stringify({ url: urls[0], urls, model: polliModel, provider: "pollinations-free", unlimited: true }),
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