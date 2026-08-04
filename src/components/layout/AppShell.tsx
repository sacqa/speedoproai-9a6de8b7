import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Home, Search, ShoppingCart, MapPin, ChevronDown, Menu,
  ShoppingBasket, Pill, Package, UtensilsCrossed,
  Mic, MoreHorizontal,
} from "lucide-react";
import { SpeedoLogo, SpeedoWordmark } from "@/components/speedo/SpeedoLogo";
import { useCart } from "@/store/cart";
import { formatPKR } from "@/lib/format";
import { AnnouncementPopup } from "@/components/app/AnnouncementPopup";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsLoader } from "@/components/app/AnalyticsLoader";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import { useGridSettings } from "@/hooks/useGridSettings";
import { MiniCart } from "@/components/speedo/MiniCart";
import { useOnline } from "@/hooks/useOnline";
import { WifiOff } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/speedmart", label: "SpeedMart", icon: ShoppingBasket },
  { to: "/pharmacy", label: "Pharmacy", icon: Pill },
  { to: "/speedsend", label: "SpeedSend", icon: Package },
  { to: "/food", label: "Food", icon: UtensilsCrossed },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/help", label: "Help", icon: MoreHorizontal },
];

export function AppShell({ children }: { children: ReactNode }) {
  const cartQty = useCart((s) => s.totalQty());
  const cartSubtotal = useCart((s) => s.subtotal());
  const location = useLocation();
  useGridSettings();
  const online = useOnline();
  const hideChrome = ["/splash", "/admin"].some((p) => location.pathname.startsWith(p));
  const hideMiniCart = ["/cart", "/checkout", "/order", "/splash"].some((p) => location.pathname.startsWith(p));

  // Bump the cart icon whenever qty increases so users get a clear confirmation
  // after tapping "Add" from a product card.
  const [bump, setBump] = useState(false);
  const prevQty = useRef(cartQty);
  useEffect(() => {
    if (cartQty > prevQty.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      prevQty.current = cartQty;
      return () => clearTimeout(t);
    }
    prevQty.current = cartQty;
  }, [cartQty]);
  const bumpCls = bump ? "animate-cart-bump" : "";

  if (hideChrome) {
    return <main className="min-h-screen bg-background"><AnalyticsLoader /><AnnouncementPopup /><InstallPrompt />{children}</main>;
  }

  return (
    <div className="min-h-screen bg-page-gradient lg:bg-[#fafaf7]">
      <AnalyticsLoader />
      <AnnouncementPopup />
      <InstallPrompt />
      {!online && (
        <div className="sticky top-0 z-50 bg-foreground text-background text-[11.5px] font-semibold px-4 py-1.5 flex items-center justify-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          You're offline — browsing saved products. Your basket is saved too.
        </div>
      )}
      {/* ===== DESKTOP HEADER — Editorial w/ creative search & cart ===== */}
      <header className="hidden lg:block sticky top-0 z-40 bg-[#fafaf7]/85 backdrop-blur-md border-b border-[#e8e4dd]">
        <div className="max-w-[1400px] mx-auto pl-6 pr-6 xl:pr-12 py-3.5 flex items-center gap-6">
          <Link to="/" className="flex items-center shrink-0" aria-label="Home">
            <SpeedoLogo size={36} />
          </Link>

          {/* Top-level services */}
          <nav className="flex items-center gap-1 shrink-0">
            {[
              { to: "/speedmart", label: "SpeedMart" },
              { to: "/food", label: "Food" },
              { to: "/pharmacy", label: "Pharmacy" },
              { to: "/speedsend", label: "SpeedSend" },
            ].map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-foreground/75 hover:bg-[#efece6]"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Creative search bar (Almeera-inspired layout) */}
          <Link
            to="/search"
            className="group flex-1 max-w-2xl flex items-center gap-3 h-12 pl-3 pr-2 rounded-full bg-white border border-[#e8e4dd] hover:border-primary/50 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.35)] transition-all"
          >
            <span className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-dark text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
              <Search className="h-[18px] w-[18px]" strokeWidth={2.6} />
            </span>
            <span className="text-[14px] text-muted-foreground flex-1 truncate font-medium">
              Search groceries, food, medicine…
            </span>
            <div className="hidden xl:flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground/70 border border-[#e8e4dd] rounded-md px-1.5 py-0.5">
              ⌘K
            </div>
            <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
              <Mic className="h-4 w-4 text-primary" />
            </span>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 mr-1 text-xs text-[#1a1a1a]/70">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">Dipalpur</span>
              <ChevronDown className="h-3 w-3" />
            </div>
            <Link to="/cart" className={`p-2 rounded-full hover:bg-[#efece6] transition-colors relative ${bumpCls}`} aria-label="Cart">
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartQty > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                  {cartQty}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* MOBILE TOP BAR */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-white/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-1.5 -ml-1.5 rounded-lg" aria-label="Menu">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <MobileMenu />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            <div className="text-xs leading-tight">
              <div className="text-muted-foreground">Delivering to</div>
              <div className="font-bold flex items-center gap-1">Dipalpur <ChevronDown className="h-3 w-3" /></div>
            </div>
          </div>
          <Link to="/cart" className={`p-1.5 -mr-1.5 relative ${bumpCls}`} aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {cartQty > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                {cartQty}
              </span>
            )}
          </Link>
        </div>
        <div className="bg-primary px-4 py-1.5 text-[11px] text-primary-foreground font-semibold overflow-hidden whitespace-nowrap flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Open now · <span className="text-accent">Free delivery</span> on orders over Rs 1500
        </div>
      </header>

      {/* MAIN */}
      <main className="lg:pt-0 pb-32 lg:pb-12">
        <div className="lg:max-w-[1400px] lg:mx-auto lg:px-8 xl:px-12 lg:py-6">
          {children}
        </div>
        <div className="lg:ml-0">
          <Footer />
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 safe-bottom">
        <div className="relative rounded-[28px] bg-white/75 dark:bg-foreground/80 backdrop-blur-2xl border border-white/60 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.25)] overflow-visible">
          <div className="grid grid-cols-5 h-[68px] items-stretch px-1">
            <BottomTab to="/" icon={Home} label="Home" />
            <BottomTab to="/search" icon={Search} label="Explore" />
            <Link to="/speedmart" aria-label="SpeedMart" className="flex justify-center items-start -mt-7">
              <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-[0_12px_28px_-6px_hsl(var(--primary)/0.65)] ring-4 ring-background/90 active:scale-95 transition-transform">
                <SpeedoLogo size={26} variant="mark" className="[&>path]:fill-white" />
              </div>
            </Link>
            <BottomTab to="/cart" icon={ShoppingCart} label="Cart" badge={cartQty} />
            <BottomTab to="/help" icon={MoreHorizontal} label="More" />
          </div>
        </div>
      </nav>

      {/* PERSISTENT MINI-CART */}
      {!hideMiniCart && <MiniCart bump={bump} />}
    </div>
  );
}

function BottomTab({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`relative h-9 w-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? "bg-primary/15" : ""}`}>
            <Icon className={`h-[22px] w-[22px] transition-all ${isActive ? "stroke-[2.5] scale-110" : "stroke-2"}`} />
            {badge !== undefined && badge > 0 && (
              <span className="absolute top-0 right-1 bg-orange text-orange-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1 ring-2 ring-background">
                {badge}
              </span>
            )}
          </div>
          <span className={`leading-none ${isActive ? "font-bold" : ""}`}>{label}</span>
          {isActive && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
        </>
      )}
    </NavLink>
  );
}

function MobileMenu() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 bg-primary text-primary-foreground">
        <SpeedoWordmark className="[&_span]:text-white [&_svg_rect]:fill-white/20" />
        <p className="text-sm mt-3 opacity-90">Hyperlocal delivery in Dipalpur</p>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold ${
                isActive ? "bg-primary-tint text-primary" : "text-foreground hover:bg-muted"
              }`
            }
          >
            <it.icon className="h-5 w-5" />
            {it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}