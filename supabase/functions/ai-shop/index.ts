// AI shopping assistant + product recommendations (Lovable AI).
// mode "recommend": returns JSON { ids } of real in-stock products.
// mode "chat": streams AI SDK UI messages; products shown via the show_products tool.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createOpenAI } from "npm:@ai-sdk/openai@^4";
import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "npm:ai@^7";
import { z } from "npm:zod@^3";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "../_shared/run-id.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

type P = { id: string; name: string; price: number; unit: string | null; image_url: string | null; stock: number; category_id: string | null; cat: string };

// Small in-memory catalog cache (per warm instance) to keep it fast and cheap.
let cache: { at: number; list: P[] } | null = null;
async function catalog(): Promise<P[]> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.list;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb
    .from("products")
    .select("id,name,price,unit,image_url,stock,category_id,categories(name)")
    .eq("is_active", true)
    .gt("stock", 0)
    .order("name")
    .limit(400);
  if (error) throw error;
  const list = (data ?? []).map((p: any) => ({ ...p, price: Number(p.price), cat: p.categories?.name ?? "Other", categories: undefined }));
  cache = { at: Date.now(), list };
  return list;
}
const catalogText = (list: P[]) => list.map((p, i) => `${i}|${p.name}|${p.cat}|Rs${Math.round(p.price)}${p.unit ? "/" + p.unit : ""}`).join("\n");
const pub = (p: P) => ({ id: p.id, name: p.name, price: p.price, unit: p.unit, image_url: p.image_url, stock: p.stock });

function provider(req: Request, key: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const openai = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: openai.responses("openai/gpt-6-astra"), runIdFetch };
}
const opts = (effort: "low" | "medium") => ({
  openai: { store: false, forceReasoning: true, reasoningEffort: effort, reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
});

function statusOf(e: any) {
  const s = Number(e?.statusCode ?? e?.status ?? e?.lastError?.statusCode);
  return [400, 401, 402, 403, 429].includes(s) ? s : 500;
}
const friendly = (s: number) =>
  s === 429 ? "Assistant is busy, please try again in a moment." :
  s === 402 ? "AI credits have run out. Please add credits in Settings → Plans & credits." :
  "AI assistant is unavailable right now.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "AI is not configured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const ctxIds = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 30) : []);

  try {
    const list = await catalog();
    const byId = new Map(list.map((p) => [p.id, p]));
    const cartNames = ctxIds(body.cart).map((id) => byId.get(id)?.name).filter(Boolean);
    const recentNames = ctxIds(body.recent).map((id) => byId.get(id)?.name).filter(Boolean);

    if (body.mode === "recommend") {
      const limit = Math.min(Math.max(Number(body.limit) || 8, 1), 12);
      const { model, runIdFetch } = provider(req, key);
      const result = streamText({
        model,
        instructions:
          "You recommend grocery products for a Pakistani delivery app. Reply ONLY with a JSON array of catalog index numbers, no text.",
        prompt:
          `Catalog (index|name|category|price):\n${catalogText(list)}\n\n` +
          `Cart: ${cartNames.join(", ") || "empty"}\nRecently viewed: ${recentNames.join(", ") || "none"}\n` +
          (cartNames.length
            ? `Pick ${limit} complementary products that go well with the cart items (not already in cart).`
            : `Pick ${limit} varied, popular everyday products this customer would likely buy.`),
        abortSignal: req.signal,
        providerOptions: opts("low"),
      });
      const text = await result.text;
      const inCart = new Set(ctxIds(body.cart));
      const nums: number[] = (text.match(/\d+/g) ?? []).map(Number);
      const ids = [...new Set(nums)].map((i) => list[i]).filter((p) => p && !inCart.has(p.id)).slice(0, limit).map((p) => p.id);
      return json({ ids, runId: runIdFetch.getRunId() ?? null });
    }

    // chat
    const messages = Array.isArray(body.messages) ? (body.messages as UIMessage[]).slice(-30) : [];
    if (!messages.length) return json({ error: "No messages" }, 400);
    const { model, runIdFetch } = provider(req, key);
    const result = streamText({
      model,
      instructions:
        "You are Speedo's friendly shopping assistant for a grocery & delivery app in Dipalpur, Pakistan. " +
        "Reply briefly in the customer's language (English, Urdu or Roman Urdu). Recommend ONLY products from the catalog below; " +
        "never invent products or prices. Whenever you suggest products, call show_products with their index numbers so the customer can add them to cart. " +
        "Prices are in PKR (Rs). Payment is Cash on Delivery.\n\n" +
        `Catalog (index|name|category|price):\n${catalogText(list)}\n\n` +
        `Customer cart: ${cartNames.join(", ") || "empty"}. Recently viewed: ${recentNames.join(", ") || "none"}.`,
      messages: await convertToModelMessages(messages),
      tools: {
        show_products: tool({
          description: "Show product cards (with Add to Cart) to the customer.",
          inputSchema: z.object({ indexes: z.array(z.number()) }),
          execute: async ({ indexes }) => ({
            products: [...new Set(indexes)].map((i) => list[i]).filter(Boolean).slice(0, 8).map(pub),
          }),
        }),
      },
      stopWhen: stepCountIs(50),
      abortSignal: req.signal,
      providerOptions: opts("low"),
    });
    return withLovableAiGatewayRunIdHeader(
      result.toUIMessageStreamResponse({
        originalMessages: messages,
        sendReasoning: false,
        onError: (e) => friendly(statusOf(e)),
      }),
      runIdFetch,
      cors,
    );
  } catch (e) {
    if ((e as any)?.name === "AbortError") return json({ error: "aborted" }, 499);
    console.error("ai-shop error", e);
    const s = statusOf(e);
    return json({ error: friendly(s) }, s);
  }
});
