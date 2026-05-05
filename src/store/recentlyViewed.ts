import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  ids: string[];
  push: (id: string) => void;
  clear: () => void;
};

const MAX = 20;

export const useRecentlyViewed = create<State>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) =>
        set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, MAX) })),
      clear: () => set({ ids: [] }),
    }),
    { name: "speedo-recent" }
  )
);