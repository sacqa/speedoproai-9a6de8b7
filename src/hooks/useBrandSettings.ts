import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/speedo-logo.png.asset.json";

export type ProductCardSettings = {
  show_category: boolean;
  show_unit: boolean;
  show_price: boolean;
  show_name: boolean;
  show_favorite: boolean;
  show_add_button: boolean;
};

export const DEFAULT_CARD_SETTINGS: ProductCardSettings = {
  show_category: true,
  show_unit: true,
  show_price: true,
  show_name: true,
  show_favorite: true,
  show_add_button: true,
};

export function useBrandLogo() {
  const q = useQuery({
    queryKey: ["app_settings", "brand"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "brand")
        .maybeSingle();
      return (data?.value ?? {}) as { logo_url?: string };
    },
  });
  return q.data?.logo_url || defaultLogo.url;
}

export function useProductCardSettings(): ProductCardSettings {
  const q = useQuery({
    queryKey: ["app_settings", "product_card"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "product_card")
        .maybeSingle();
      return (data?.value ?? {}) as Partial<ProductCardSettings>;
    },
  });
  return { ...DEFAULT_CARD_SETTINGS, ...(q.data ?? {}) };
}