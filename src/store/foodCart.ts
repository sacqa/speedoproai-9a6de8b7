import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FoodCartItem = {
  item_id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
};

type State = {
  vendorId: string | null;
  vendorName: string | null;
  items: FoodCartItem[];
  add: (vendorId: string, vendorName: string, item: Omit<FoodCartItem, "quantity">) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  subtotal: () => number;
  totalQty: () => number;
};

export const useFoodCart = create<State>()(
  persist(
    (set, get) => ({
      vendorId: null,
      vendorName: null,
      items: [],
      add: (vendorId, vendorName, item) =>
        set((s) => {
          // switching vendor resets cart
          if (s.vendorId && s.vendorId !== vendorId) {
            return { vendorId, vendorName, items: [{ ...item, quantity: 1 }] };
          }
          const existing = s.items.find((i) => i.item_id === item.item_id);
          if (existing) {
            return {
              vendorId,
              vendorName,
              items: s.items.map((i) => (i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i)),
            };
          }
          return { vendorId, vendorName, items: [...s.items, { ...item, quantity: 1 }] };
        }),
      setQty: (id, qty) =>
        set((s) => {
          const items = qty <= 0 ? s.items.filter((i) => i.item_id !== id) : s.items.map((i) => (i.item_id === id ? { ...i, quantity: qty } : i));
          return { items, vendorId: items.length ? s.vendorId : null, vendorName: items.length ? s.vendorName : null };
        }),
      remove: (id) =>
        set((s) => {
          const items = s.items.filter((i) => i.item_id !== id);
          return { items, vendorId: items.length ? s.vendorId : null, vendorName: items.length ? s.vendorName : null };
        }),
      clear: () => set({ vendorId: null, vendorName: null, items: [] }),
      subtotal: () => get().items.reduce((a, b) => a + b.quantity * Number(b.price), 0),
      totalQty: () => get().items.reduce((a, b) => a + b.quantity, 0),
    }),
    { name: "speedo-food-cart" },
  ),
);