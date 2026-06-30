import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  product_id: string;
  name: string;
  price: number;
  unit?: string | null;
  image_url?: string | null;
  quantity: number;
  variant_id?: string | null;
  variant_label?: string | null;
};

type CartState = {
  items: CartItem[];
  _hydrated: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  totalQty: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      _hydrated: false,
      add: (item, qty = 1) =>
        set((s) => {
          const sameLine = (i: CartItem) =>
            i.product_id === item.product_id && (i.variant_id ?? null) === (item.variant_id ?? null);
          const existing = s.items.find(sameLine);
          if (existing) {
            return {
              items: s.items.map((i) => (sameLine(i) ? { ...i, quantity: i.quantity + qty } : i)),
            };
          }
          return { items: [...s.items, { ...item, quantity: qty }] };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.product_id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.product_id !== id)
            : s.items.map((i) => (i.product_id === id ? { ...i, quantity: qty } : i)),
        })),
      clear: () => set({ items: [] }),
      totalQty: () => get().items.reduce((a, b) => a + b.quantity, 0),
      subtotal: () => get().items.reduce((a, b) => a + b.quantity * Number(b.price), 0),
    }),
    {
      name: "speedo-cart",
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);