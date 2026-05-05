import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Body: { mode: "cart" | "explore", cartItems?: string[], recent?: string[] }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode = "explore", cartItems = [], recent = [] } = await req.json().catch(() => ({}));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch active product catalog (slim list).
    const { data: products, error } = await supabase
      .from("products")
      .select("id,name,unit,price,category_id,is_active,image_url")
      .eq("is_active", true)
      .limit(400);
    if (error) throw error;

    const catalog = (products ?? []).map((p) => `${p.id}|${p.name}${p.unit ? " (" + p.unit + ")" : ""}`).join("\n");

    const system =
      mode === "cart"
        ? "You are a smart grocery cross-sell assistant for a Pakistani hyperlocal delivery app. Given a customer's current cart, suggest complementary or commonly co-purchased items from the catalog (e.g. sugar → tea, milk, biscuits; bread → butter, jam, eggs). Return 6 suggestions max, never include items already in the cart."
        : "You are a personalised grocery recommender for a Pakistani hyperlocal app. Suggest 8 popular & useful everyday products from the catalog the user is likely to want, biased by their recently viewed items if provided.";

    const userPrompt =
      mode === "cart"
        ? `Cart items:\n${cartItems.join(", ") || "(empty)"}\n\nProduct catalog (id|name):\n${catalog}`
        : `Recently viewed: ${recent.join(", ") || "(none)"}\n\nProduct catalog (id|name):\n${catalog}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Return product suggestions chosen from catalog.",
              parameters: {
                type: "object",
                properties: {
                  product_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "Catalog product ids in priority order",
                  },
                  reason: { type: "string" },
                },
                required: ["product_ids"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_suggestions" } },
      }),
    });

    if (aiResp.status === 429)
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly", product_ids: [] }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (aiResp.status === 402)
      return new Response(JSON.stringify({ error: "AI credits exhausted", product_ids: [] }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const data = await aiResp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let ids: string[] = [];
    try {
      const parsed = JSON.parse(call?.function?.arguments ?? "{}");
      ids = (parsed.product_ids ?? []).filter((x: unknown) => typeof x === "string");
    } catch {
      ids = [];
    }

    // Validate against catalog and exclude cart items.
    const valid = new Set((products ?? []).map((p) => p.id));
    const inCart = new Set(cartItems);
    ids = ids.filter((id) => valid.has(id) && !inCart.has(id)).slice(0, mode === "cart" ? 6 : 8);

    // Hydrate full product rows in original order.
    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    const suggestions = ids.map((id) => byId.get(id)).filter(Boolean);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-suggest error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown", suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});