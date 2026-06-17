import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIZES: Record<string, string> = {
  square: "1024x1024",
  banner: "1536x1024",
  portrait: "1024x1536",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supaUrl, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { prompt, preset = "square", bucket = "products", context, style = "vibrant" } = body;
    const count = Math.max(1, Math.min(6, Number(body.count ?? 1)));
    if (!prompt || typeof prompt !== "string") return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const size = SIZES[preset] ?? SIZES.square;

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

    const generateOne = async (idx: number): Promise<string> => {
      // Slight per-image variance keeps a batch from returning duplicates.
      const seed = idx === 0 ? styled : `${styled} Variant ${idx + 1}: alternate angle, fresh composition, different lighting mood.`;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-image-2", prompt: seed, size, quality: "low", n: 1 }),
      });
      if (!res.ok) {
        const t = await res.text();
        const code = res.status === 402 || res.status === 429 ? res.status : 500;
        throw new Response(JSON.stringify({ error: `AI failed: ${res.status} ${t}` }), {
          status: code,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const json = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) throw new Response(JSON.stringify({ error: "No image returned" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `ai/${Date.now()}-${idx}-${crypto.randomUUID().slice(0, 8)}.png`;
      const { error: upErr } = await admin.storage.from(bucket).upload(path, bin, { contentType: "image/png", upsert: true });
      if (upErr) throw new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
      return pub.publicUrl;
    };

    try {
      // Sequential to respect rate limits and ordering.
      const urls: string[] = [];
      for (let i = 0; i < count; i++) urls.push(await generateOne(i));
      return new Response(JSON.stringify({ url: urls[0], urls }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (resp) {
      if (resp instanceof Response) return resp;
      throw resp;
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});