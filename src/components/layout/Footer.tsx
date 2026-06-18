import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { useIsStandalone } from "@/hooks/useIsStandalone";

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
  const isStandalone = useIsStandalone();
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "footer").maybeSingle()
      .then(({ data }) => { if (data?.value) setV({ ...DEFAULTS, ...(data.value as FooterValue) }); });
  }, []);
  const company = v.company_links ?? [];
  const legal = v.legal_links ?? [];
  // When installed as a PWA on mobile, hide the link/help sections — they're for web visitors,
  // not for users already inside the installed app. Keep only a slim copyright bar.
  if (isStandalone) {
    return (
      <footer className="mt-6 pb-24 lg:pb-6 px-4">
        <div className="text-center text-[11px] text-muted-foreground">
          {v.copyright} · Made with ♥ in Dipalpur
        </div>
      </footer>
    );
  }
  return (
    <footer className="mt-10 lg:mt-14 px-3 sm:px-4 lg:px-0 pb-24 lg:pb-6">
      <div className="glass-sheet rounded-3xl overflow-hidden max-w-7xl mx-auto">
        {/* Brand band */}
        <div className="p-5 sm:p-7 lg:p-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <SpeedoLogo size={32} />
              <span className="font-extrabold text-lg">Speedo</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{v.brand_tagline}</p>
          </div>
          <Link
            to="/help"
            className="self-start sm:self-center inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold bg-foreground text-background shadow-card hover:scale-[1.03] active:scale-95 transition-transform"
          >
            Need help?
          </Link>
        </div>

        {/* Mobile accordion groups / desktop columns */}
        <div className="border-t border-white/40 px-2 sm:px-4 lg:px-10 lg:py-8 lg:grid lg:grid-cols-3 lg:gap-10">
          <AccordionGroup title="Company" links={company} />
          <AccordionGroup title="Legal" links={legal} />
          <div className="lg:block">
            <details className="lg:hidden group border-b border-white/40">
              <summary className="flex items-center justify-between py-3.5 px-2 text-sm font-bold cursor-pointer list-none">
                Get the app
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4 px-2 text-sm text-muted-foreground">{v.app_note}</p>
            </details>
            <div className="hidden lg:block">
              <div className="font-bold mb-3">Get the app</div>
              <p className="text-sm text-muted-foreground">{v.app_note}</p>
            </div>
          </div>
        </div>

        {/* Legal bar */}
        <div className="border-t border-white/40 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
          <span>{v.copyright}</span>
          <span className="opacity-70">Made with ♥ in Dipalpur</span>
        </div>
      </div>
    </footer>
  );
}

function AccordionGroup({ title, links }: { title: string; links: { label: string; url: string }[] }) {
  if (!links.length) return null;
  return (
    <>
      <details className="lg:hidden group border-b border-white/40">
        <summary className="flex items-center justify-between py-3.5 px-2 text-sm font-bold cursor-pointer list-none">
          {title}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="pb-3 px-2 space-y-2 text-sm text-muted-foreground">
          {links.map((l, i) => (
            <li key={i}><Link to={l.url || "#"} className="hover:text-primary">{l.label}</Link></li>
          ))}
        </ul>
      </details>
      <div className="hidden lg:block">
        <div className="font-bold mb-3">{title}</div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {links.map((l, i) => (
            <li key={i}><Link to={l.url || "#"} className="hover:text-primary">{l.label}</Link></li>
          ))}
        </ul>
      </div>
    </>
  );
}