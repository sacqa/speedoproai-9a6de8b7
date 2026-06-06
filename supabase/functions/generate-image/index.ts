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

    const { prompt, preset = "square", bucket = "products", context } = await req.json();
    if (!prompt || typeof prompt !== "string") return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const size = SIZES[preset] ?? SIZES.square;

    let styled = prompt;
    if (context === "product") styled = `High-quality product photography of ${prompt}, centered, clean studio background, soft shadows, e-commerce style, photorealistic, vivid colors`;
    else if (context === "category") styled = `Modern minimalist icon illustration representing ${prompt}, flat design, vibrant gradient, clean white background, simple and recognizable`;
    else if (context === "banner") styled = `Professional promotional banner: ${prompt}. Vibrant marketing design, eye-catching, modern typography space on the left, lifestyle photography, high-end advertising aesthetic`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-image-2", prompt: styled, size, quality: "low", n: 1 }),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI failed: ${res.status} ${t}` }), { status: res.status === 402 || res.status === 429 ? res.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return new Response(JSON.stringify({ error: "No image returned" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `ai/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    const { error: upErr } = await admin.storage.from(bucket).upload(path, bin, { contentType: "image/png", upsert: true });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
    return new Response(JSON.stringify({ url: pub.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});