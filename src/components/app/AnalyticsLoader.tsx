import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Injects Google Analytics 4 + Microsoft Clarity tags using IDs stored in app_settings.
// Listens to realtime updates so changes made in the admin panel apply instantly without refresh.

type AnalyticsSettings = {
  ga4_measurement_id?: string;
  clarity_project_id?: string;
};

const GA_ID = "speedo-ga4-script";
const GA_INIT_ID = "speedo-ga4-init";
const CLARITY_ID = "speedo-clarity-script";

function applyGA(id: string | undefined) {
  const head = document.head;
  const existing = document.getElementById(GA_ID);
  if (!id) {
    existing?.remove();
    document.getElementById(GA_INIT_ID)?.remove();
    return;
  }
  if (existing?.getAttribute("data-id") === id) return;
  existing?.remove();
  document.getElementById(GA_INIT_ID)?.remove();

  const s = document.createElement("script");
  s.id = GA_ID;
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  s.setAttribute("data-id", id);
  head.appendChild(s);

  const init = document.createElement("script");
  init.id = GA_INIT_ID;
  init.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id.replace(/'/g, "")}',{send_page_view:true});`;
  head.appendChild(init);
}

function applyClarity(id: string | undefined) {
  const existing = document.getElementById(CLARITY_ID);
  if (!id) {
    existing?.remove();
    return;
  }
  if (existing?.getAttribute("data-id") === id) return;
  existing?.remove();
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const s = document.createElement("script");
  s.id = CLARITY_ID;
  s.setAttribute("data-id", safe);
  s.text =
    "(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','" +
    safe +
    "');";
  document.head.appendChild(s);
}

export function AnalyticsLoader() {
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "analytics").maybeSingle();
      const v = (data?.value ?? {}) as AnalyticsSettings;
      applyGA(v.ga4_measurement_id?.trim() || undefined);
      applyClarity(v.clarity_project_id?.trim() || undefined);
    };
    load();

    const ch = supabase
      .channel("analytics-settings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.analytics" },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return null;
}