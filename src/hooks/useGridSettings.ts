import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type GridCols = { mobile?: number; tablet?: number; desktop?: number };

const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(v)));
};

export function useGridSettings() {
  const q = useQuery({
    queryKey: ["app_settings", "grid_columns"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "grid_columns")
        .maybeSingle();
      return (data?.value ?? {}) as GridCols;
    },
  });
  useEffect(() => {
    const v = q.data ?? {};
    const m = clamp(v.mobile, 2, 4, 3);
    const t = clamp(v.tablet, 2, 6, 3);
    const l = clamp(v.desktop, 2, 8, 4);
    const root = document.documentElement;
    root.style.setProperty("--grid-cols-m", String(m));
    root.style.setProperty("--grid-cols-t", String(t));
    root.style.setProperty("--grid-cols-l", String(l));
  }, [q.data]);
}