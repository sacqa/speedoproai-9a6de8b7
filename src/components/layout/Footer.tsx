import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";

type LinkItem = { label: string; url: string };
export type FooterValue = {
  brand_tagline?: string;
  company_links?: LinkItem[];
  legal_links?: LinkItem[];
  app_note?: string;
  copyright?: string;
};

const DEFAULTS: FooterValue = {
  brand_tagline: "Hyperlocal delivery in Dipalpur, Pakistan.",
  company_links: [{ label: "About", url: "#" }, { label: "Contact", url: "#" }, { label: "Careers", url: "#" }],
  legal_links: [{ label: "Privacy Policy", url: "#" }, { label: "Terms of Service", url: "#" }],
  app_note: "Install Speedo from your browser menu → Add to Home Screen.",
  copyright: "© Speedo",
};

export function Footer() {
  const [v, setV] = useState<FooterValue>(DEFAULTS);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "footer").maybeSingle()
      .then(({ data }) => { if (data?.value) setV({ ...DEFAULTS, ...(data.value as FooterValue) }); });
  }, []);
  return (
    <footer className="hidden lg:block border-t border-border bg-card/60 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3"><SpeedoLogo size={28} /><span className="font-extrabold">Speedo</span></div>
          <p className="text-muted-foreground">{v.brand_tagline}</p>
        </div>
        <div>
          <div className="font-bold mb-3">Company</div>
          <ul className="space-y-2 text-muted-foreground">
            {(v.company_links ?? []).map((l, i) => <li key={i}><Link to={l.url || "#"} className="hover:text-primary">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <div className="font-bold mb-3">Legal</div>
          <ul className="space-y-2 text-muted-foreground">
            {(v.legal_links ?? []).map((l, i) => <li key={i}><Link to={l.url || "#"} className="hover:text-primary">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <div className="font-bold mb-3">Get the app</div>
          <p className="text-muted-foreground">{v.app_note}</p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">{v.copyright}</div>
    </footer>
  );
}