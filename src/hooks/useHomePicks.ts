import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomePicksPlacement = "after_services" | "after_banner" | "after_categories" | "after_featured" | "bottom";
export type HomePicks = { enabled: boolean; title: string; placement: HomePicksPlacement; product_ids: string[] };
export const HOME_PICKS_DEFAULTS: HomePicks = { enabled: false, title: "Picked for you", placement: "after_banner", product_ids: [] };

export function useHomePicks() {
  return useQuery({
    queryKey: ["app_settings", "home_picks"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "home_picks").maybeSingle();
      return { ...HOME_PICKS_DEFAULTS, ...((data?.value as any) ?? {}) } as HomePicks;
    },
  });
}
