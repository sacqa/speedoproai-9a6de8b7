// Free, rule-based shopping assistant + recommendations (no AI API calls).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CatalogProduct = {
  id: string; name: string; price: number; unit: string | null; image_url: string | null;
  stock: number; category_id: string | null; is_featured: boolean; cat: string;
};

/** Live in-stock catalog, shared via React Query cache (prices & stock stay in sync). */
export function useCatalog() {
  return useQuery({
    queryKey: ["assistant-catalog"],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,price,unit,image_url,stock,category_id,is_featured,categories(name)")
        .eq("is_active", true).gt("stock", 0).limit(1000);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({ ...p, price: Number(p.price), cat: p.categories?.name ?? "" })) as CatalogProduct[];
    },
  });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]+/g, " ");
const has = (p: CatalogProduct, words: string[]) => {
  const t = norm(`${p.name} ${p.cat}`);
  return words.some((w) => t.includes(w));
};

// What goes well with what (keyword → complementary keywords).
const PAIRS: [string[], string[]][] = [
  [["bread", "bun", "rusk"], ["egg", "butter", "jam", "milk", "cheese", "tea"]],
  [["egg"], ["bread", "butter", "milk", "paratha"]],
  [["tea", "chai", "coffee"], ["milk", "sugar", "biscuit", "rusk", "cake"]],
  [["milk"], ["tea", "cereal", "bread", "sugar", "biscuit"]],
  [["rice", "chawal"], ["oil", "ghee", "masala", "daal", "dal", "spice", "salt"]],
  [["flour", "atta", "aata"], ["oil", "ghee", "daal", "dal", "salt"]],
  [["daal", "dal", "lentil"], ["rice", "onion", "tomato", "masala", "oil"]],
  [["oil", "ghee"], ["rice", "atta", "flour", "masala", "onion"]],
  [["chicken", "meat", "mutton", "beef"], ["masala", "onion", "tomato", "oil", "yogurt", "ginger", "garlic"]],
  [["tomato", "tamatar", "onion", "pyaz", "potato", "aloo"], ["masala", "oil", "chilli", "mirch", "salt", "onion", "tomato"]],
  [["chips", "snack", "nimko", "biscuit"], ["drink", "cola", "juice", "pepsi", "water"]],
  [["cola", "pepsi", "drink", "juice"], ["chips", "snack", "nimko", "biscuit"]],
  [["noodle", "pasta", "macaroni"], ["ketchup", "sauce", "cheese"]],
  [["shampoo", "soap"], ["conditioner", "toothpaste", "detergent"]],
];

/** Complementary products for a cart, or popular varied picks when cart is empty. */
export function recommend(catalog: CatalogProduct[], cartIds: string[], limit = 8): CatalogProduct[] {
  const inCart = new Set(cartIds);
  const pool = catalog.filter((p) => !inCart.has(p.id));
  const cart = catalog.filter((p) => inCart.has(p.id));
  const score = new Map<string, number>();
  const bump = (p: CatalogProduct, n: number) => score.set(p.id, (score.get(p.id) ?? 0) + n);

  if (cart.length) {
    const cats = new Set(cart.map((p) => p.category_id));
    for (const c of cart) for (const [keys, comps] of PAIRS) if (has(c, keys)) pool.forEach((p) => has(p, comps) && bump(p, 3));
    pool.forEach((p) => { if (cats.has(p.category_id)) bump(p, 1); if (p.is_featured) bump(p, 0.5); });
  } else {
    pool.forEach((p) => bump(p, p.is_featured ? 2 : 0));
  }
  // Stable daily shuffle as tie-breaker so suggestions feel fresh.
  const day = new Date().toDateString();
  const h = (s: string) => { let x = 0; for (const ch of s + day) x = (x * 31 + ch.charCodeAt(0)) | 0; return x; };
  const ranked = [...pool].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || h(a.id) - h(b.id));
  // Diversity: max 2 per category.
  const per = new Map<string, number>(); const out: CatalogProduct[] = [];
  for (const p of ranked) {
    const k = p.category_id ?? ""; if ((per.get(k) ?? 0) >= 2) continue;
    per.set(k, (per.get(k) ?? 0) + 1); out.push(p); if (out.length >= limit) break;
  }
  return out;
}

const FAQ: [string[], string][] = [
  [["deliver", "delivery", "charge", "fee", "kitne din", "kab tak"], "We deliver same-day in Dipalpur and nearby areas. The delivery fee depends on your area and is shown in your basket before you order."],
  [["pay", "payment", "cash", "cod", "jazzcash", "easypaisa"], "Payment is **Cash on Delivery** — pay our rider when your order arrives."],
  [["track", "status", "kahan", "where is my order"], "You can track your order from the **Track order** page using your order number and phone."],
  [["cancel", "return", "refund", "wapas"], "To cancel or return something, please message us on WhatsApp with your order number and we'll help right away."],
  [["contact", "whatsapp", "number", "phone", "call"], "You can reach us on WhatsApp from the Help page — we usually reply within minutes."],
  [["account", "login", "sign up", "signup"], "No account needed! Just add items to your basket and enter your name, phone and address at checkout."],
  [["minimum", "min order"], "Some areas have a small minimum order — your basket shows it automatically before checkout."],
];

const INTENTS: [string[], string[], string][] = [
  [["breakfast", "nashta", "nashta"], ["bread", "egg", "milk", "butter", "jam", "tea", "paratha", "rusk", "cereal"], "Here are some breakfast picks:"],
  [["snack", "guest", "mehman", "party"], ["chips", "nimko", "biscuit", "cola", "drink", "juice", "cake", "chocolate"], "Great for guests and snacking:"],
  [["healthy", "diet", "fit"], ["fruit", "apple", "banana", "kela", "saib", "guava", "spinach", "palak", "oats", "yogurt", "nuts"], "Some healthy options:"],
  [["fruit", "phal"], ["fruit", "apple", "banana", "mango", "grape", "orange", "kinnow", "guava"], "Fresh fruits available now:"],
  [["sabzi", "vegetable", "veggie"], ["sabzi", "vegetable", "tomato", "potato", "onion", "okra", "bhindi", "spinach", "chilli"], "Fresh sabzi available now:"],
  [["cook", "khana", "dinner", "lunch", "handi"], ["oil", "ghee", "rice", "atta", "masala", "onion", "tomato", "daal"], "Cooking essentials:"],
  [["drink", "thirst", "cold", "pyas"], ["cola", "drink", "juice", "water", "pepsi"], "Something to drink:"],
];

export type Reply = { text: string; products: CatalogProduct[] };

export function answer(q: string, catalog: CatalogProduct[], cartIds: string[]): Reply {
  const t = norm(q);
  const budgetM = t.match(/(?:under|below|less than|se kam|tak|rs)\s*(\d{2,6})|(\d{2,6})\s*(?:se kam|tak|rs|rupees?)/);
  const budget = budgetM ? Number(budgetM[1] ?? budgetM[2]) : null;
  const withinBudget = (list: CatalogProduct[]) => (budget ? list.filter((p) => p.price <= budget) : list);
  const pick = (list: CatalogProduct[]) => withinBudget(list).sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.price - b.price).slice(0, 6);

  if (/^(hi|hello|hey|salam|assalam|aoa|asalam)/.test(t.trim()))
    return { text: "Wa Alaikum Assalam! 👋 Tell me what you need — e.g. *breakfast*, *snacks for guests*, *fruits under Rs 300*, or any product name.", products: [] };

  for (const [keys, reply] of FAQ) if (keys.some((k) => t.includes(k))) return { text: reply, products: [] };

  if (/(cart|basket|complement|saath|together|aur kya)/.test(t)) {
    const r = withinBudget(recommend(catalog, cartIds, 6));
    return { text: cartIds.length ? "These go well with what's in your basket:" : "Your basket is empty — here are some popular picks:", products: r };
  }

  for (const [keys, words, intro] of INTENTS) {
    if (keys.some((k) => t.includes(k))) {
      const r = pick(catalog.filter((p) => has(p, words)));
      if (r.length) return { text: budget ? `${intro} (under Rs ${budget})` : intro, products: r };
    }
  }

  // Free-text product search.
  const words = t.split(/\s+/).filter((w) => w.length > 2 && !["the", "and", "for", "chahiye", "want", "need", "kya", "hai", "under", "below", "show", "mujhe", "please"].includes(w));
  if (words.length) {
    const scored = catalog.map((p) => ({ p, s: words.filter((w) => norm(`${p.name} ${p.cat}`).includes(w)).length })).filter((x) => x.s > 0);
    const r = withinBudget(scored.sort((a, b) => b.s - a.s || a.p.price - b.p.price).map((x) => x.p)).slice(0, 6);
    if (r.length) return { text: "Here's what I found:", products: r };
  }
  if (budget) {
    const r = pick(catalog);
    if (r.length) return { text: `Popular items under Rs ${budget}:`, products: r };
  }
  return {
    text: "Sorry, I couldn't find that. Try a product name (e.g. *milk*, *rice*, *chips*) or ask for *breakfast*, *snacks*, *fruits* or *sabzi*. For anything else, message us on WhatsApp from the Help page.",
    products: recommend(catalog, cartIds, 4),
  };
}
