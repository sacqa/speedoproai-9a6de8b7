import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ShoppingBasket, Pill, Package, PenSquare, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/speedo/ProductCard";
import { SectionHeader } from "@/components/speedo/SectionHeader";

export default function Home() {
  const banners = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const featured = useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).eq("is_featured", true).limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-7 lg:space-y-10 pb-4">
      {/* Mobile search */}
      <div className="lg:hidden px-4 pt-4">
        <Link to="/search" className="flex items-center gap-2 bg-card rounded-pill px-4 py-3 shadow-card border border-border">
          <span className="text-muted-foreground text-sm flex-1">🔍 Search for fresh food, medicine, anything…</span>
        </Link>
      </div>

      <BannerSlider banners={banners.data ?? []} />
      <ServiceShortcuts />

      <section>
        <SectionHeader title="Categories" viewAllTo="/speedmart" />
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-4 px-4 lg:px-0 pb-2">
            {(cats.data ?? []).map((c) => (
              <Link to={`/speedmart?cat=${c.slug}`} key={c.id} className="flex-shrink-0 w-20 text-center group">
                <div className="h-20 w-20 rounded-2xl bg-accent-soft flex items-center justify-center text-3xl shadow-card group-hover:scale-105 transition-transform">
                  {c.icon}
                </div>
                <p className="mt-2 text-[11px] font-semibold leading-tight line-clamp-2">{c.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Featured Products" viewAllTo="/speedmart" />
        <div className="px-4 lg:px-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {featured.data?.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      </section>

      {/* Footer (desktop) */}
      <footer className="hidden lg:block border-t border-border mt-10 pt-8 pb-4 text-sm text-muted-foreground">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="font-bold text-foreground mb-2">Speedo</div>
            <p>Hyperlocal delivery in Dipalpur, Pakistan.</p>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-2">Company</div>
            <ul className="space-y-1"><li>About</li><li>Contact</li><li>Careers</li></ul>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-2">Legal</div>
            <ul className="space-y-1"><li>Privacy Policy</li><li>Terms of Service</li></ul>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-2">Get the app</div>
            <p className="text-xs">Install Speedo from your browser menu → Add to Home Screen.</p>
          </div>
        </div>
        <p className="text-xs mt-6 text-center">© {new Date().getFullYear()} Speedo. All rights reserved.</p>
      </footer>
    </div>
  );
}

function DeliveryModeSelector() {
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  return (
    <div className="px-4 lg:px-0 grid grid-cols-2 gap-2">
      <button
        onClick={() => setMode("instant")}
        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
          mode === "instant" ? "border-primary bg-primary-tint" : "border-border bg-card"
        }`}
      >
        <div>
          <div className="text-xs text-muted-foreground">Instant Delivery</div>
          <div className="text-sm font-bold">In 40 mins</div>
        </div>
      </button>
      <button
        onClick={() => setMode("scheduled")}
        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
          mode === "scheduled" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
        }`}
      >
        <div>
          <div className="text-xs opacity-80">Scheduled</div>
          <div className="text-sm font-bold">Today 8–10am</div>
        </div>
      </button>
    </div>
  );
}

function BannerSlider({ banners }: { banners: any[] }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (banners.length === 0) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);
  if (!banners.length) return null;
  const b = banners[i];
  return (
    <div className="px-4 lg:px-0">
      <div className="relative rounded-2xl overflow-hidden h-44 lg:h-80 shadow-card" ref={ref}>
        <img src={b.image_url} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 p-5 lg:p-10 flex flex-col justify-center text-white max-w-md">
          <h3 className="text-xl lg:text-3xl font-extrabold leading-tight">{b.title}</h3>
          {b.subtitle && <p className="mt-1 lg:mt-2 text-sm lg:text-base opacity-95">{b.subtitle}</p>}
          {b.cta_label && (
            <Link to={b.cta_link || "/"} className="mt-3 lg:mt-5 inline-flex items-center gap-1 self-start bg-white text-primary font-bold text-sm px-4 py-2 rounded-pill">
              {b.cta_label} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <button onClick={() => setI((x) => (x - 1 + banners.length) % banners.length)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setI((x) => (x + 1) % banners.length)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center shadow">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceShortcuts() {
  const services = [
    { to: "/speedmart", icon: ShoppingBasket, name: "SpeedMart", desc: "Groceries & Essentials" },
    { to: "/pharmacy", icon: Pill, name: "Pharmacy", desc: "Medicines & Health" },
    { to: "/speedsend", icon: Package, name: "SpeedSend", desc: "Send a Parcel" },
    { to: "/custom", icon: PenSquare, name: "Custom", desc: "Any Custom Request" },
  ];
  return (
    <div className="px-4 lg:px-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map((s) => (
          <Link key={s.to} to={s.to} className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3 hover:shadow-elevated transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-accent-soft flex items-center justify-center flex-shrink-0">
              <s.icon className="h-6 w-6 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{s.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{s.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}