import { describe, expect, it } from "vitest";
import { answer, type CatalogProduct } from "@/lib/shopAssistant";

const catalog: CatalogProduct[] = [
  { id: "1", name: "Nescafe Classic Coffee Jar", price: 900, unit: "pc", image_url: null, stock: 10, category_id: "c1", is_featured: false, cat: "Coffee & Tea" },
  { id: "2", name: "Cashew Nuts 250g", price: 700, unit: "pack", image_url: null, stock: 10, category_id: "c2", is_featured: false, cat: "Snacks" },
  { id: "3", name: "Dawn Bread", price: 90, unit: "pc", image_url: null, stock: 10, category_id: "c3", is_featured: true, cat: "Bakery" },
];

describe("shopAssistant answer()", () => {
  it("shows coffee products, not the delivery-fee FAQ", () => {
    const r = answer("coffee", catalog, []);
    expect(r.products.some((p) => p.id === "1")).toBe(true);
    expect(r.text).not.toMatch(/deliver/i);
  });

  it("shows cashew products, not the cash-on-delivery FAQ", () => {
    const r = answer("kaju cashew", catalog, []);
    expect(r.products.some((p) => p.id === "2")).toBe(true);
    expect(r.text).not.toMatch(/cash on delivery/i);
  });

  it("still answers real delivery questions", () => {
    const r = answer("delivery charges?", catalog, []);
    expect(r.text).toMatch(/deliver same-day/i);
    expect(r.products).toHaveLength(0);
  });

  it("still answers payment questions", () => {
    const r = answer("cash on delivery?", catalog, []);
    expect(r.text).toMatch(/Cash on Delivery/i);
  });
});
