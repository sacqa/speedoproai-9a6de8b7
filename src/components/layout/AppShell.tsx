import { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Home, Search, ShoppingCart, User, Bell, MapPin, ChevronDown, Menu,
  ShoppingBasket, Pill, Package, UtensilsCrossed, ClipboardList, LogOut,
} from "lucide-react";
import { SpeedoLogo, SpeedoWordmark } from "@/components/speedo/SpeedoLogo";
import { useCart } from "@/store/cart";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/format";
import { AnnouncementPopup } from "@/components/app/AnnouncementPopup";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/speedmart", label: "SpeedMart", icon: ShoppingBasket },
  { to: "/pharmacy", label: "Pharmacy", icon: Pill },
  { to: "/speedsend", label: "SpeedSend", icon: Package },
  { to: "/food", label: "Food", icon: UtensilsCrossed },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const cartQty = useCart((s) => s.totalQty());
  const cartSubtotal = useCart((s) => s.subtotal());
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { Banner } = useRealtimeNotifications();
  const hideChrome = ["/login", "/otp", "/onboarding", "/splash", "/admin"].some((p) => location.pathname.startsWith(p));
  const hideCheckoutBar = ["/cart", "/checkout", "/order"].some((p) => location.pathname.startsWith(p));

  if (hideChrome) {
    return <main className="min-h-screen bg-background">{Banner}<AnnouncementPopup /><InstallPrompt />{children}</main>;
  }

  return (
    <div className="min-h-screen bg-page-gradient">
      {Banner}
      <AnnouncementPopup />
      <InstallPrompt />
      {/* DESKTOP HEADER */}
      <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center glass border-b border-white/40 px-6">
        <Link to="/" className="flex items-center gap-3 mr-6">
          <SpeedoLogo size={36} />
          <span className="text-xl font-extrabold tracking-tight">Speedo</span>
        </Link>
        <div className="flex items-center gap-2 mr-6 px-3 py-2 rounded-pill bg-muted/60 cursor-pointer">
          <MapPin className="h-4 w-4 text-primary" />
          <div className="text-sm">
            <div className="text-muted-foreground text-xs leading-none">Delivering to</div>
            <div className="font-semibold leading-tight">Dipalpur</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 max-w-2xl">
          <Link
            to="/search"
            className="flex items-center gap-2 bg-muted rounded-pill px-4 py-2.5 hover:bg-muted/80 transition-colors"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm text-muted-foreground">
              Search for fresh food, medicine, anything...
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 ml-6">
          <Link to="/notifications" className="p-2 rounded-full hover:bg-muted relative">
            <Bell className="h-5 w-5" />
          </Link>
          <Link to="/cart" className="p-2 rounded-full hover:bg-muted relative">
            <ShoppingCart className="h-5 w-5" />
            {cartQty > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-orange text-orange-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {cartQty}
              </span>
            )}
          </Link>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button size="sm" className="rounded-pill">Login</Button>
            </Link>
          )}
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-60 glass border-r border-white/40 flex-col py-6 px-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary-tint text-primary"
                    : "text-foreground/70 hover:bg-muted"
                }`
              }
            >
              <it.icon className="h-5 w-5" />
              {it.label}
            </NavLink>
          ))}
        </nav>
      </aside>

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
          <Link to="/notifications" className="p-1.5 -mr-1.5">
            <Bell className="h-5 w-5" />
          </Link>
        </div>
        <div className="bg-primary px-4 py-1.5 text-[11px] text-primary-foreground font-semibold overflow-hidden whitespace-nowrap flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Open now · <span className="text-accent">Free delivery</span> on orders over Rs 1500
        </div>
      </header>

      {/* MAIN */}
      <main className="lg:ml-60 lg:pt-0 pb-24 lg:pb-12">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 floating-nav safe-bottom">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <BottomTab to="/" icon={Home} label="Home" />
          <BottomTab to="/search" icon={Search} label="Explore" />
          <Link to="/speedmart" aria-label="SpeedMart" className="flex justify-center -mt-8 pointer-events-none">
            <div className="h-16 w-16 rounded-2xl btn-glossy rotate-45 flex items-center justify-center pointer-events-auto">
              <div className="-rotate-45">
                <SpeedoLogo size={28} variant="mark" className="[&>path]:fill-accent" />
              </div>
            </div>
          </Link>
          <BottomTab to="/cart" icon={ShoppingCart} label="Cart" badge={cartQty} />
          <BottomTab to={user ? "/profile" : "/login"} icon={User} label={user ? "Profile" : "More"} />
        </div>
      </nav>

      {/* PROCEED TO CHECKOUT STICKY BAR */}
      {cartQty > 0 && !hideCheckoutBar && (
        <Link
          to="/cart"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 z-50 w-[92%] max-w-md flex items-center justify-between gap-3 btn-glossy px-4 py-3 hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {cartQty}
              </span>
            </div>
            <div className="leading-tight">
              <div className="text-[11px] opacity-90">{cartQty} item{cartQty > 1 ? "s" : ""} · {formatPKR(cartSubtotal)}</div>
              <div className="text-sm font-bold">Proceed to Checkout</div>
            </div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">→</div>
        </Link>
      )}
    </div>
  );
}

function BottomTab({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`relative px-4 py-1 rounded-full transition-all ${isActive ? "bg-primary/15 scale-105" : ""}`}>
            <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-0.5 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                {badge}
              </span>
            )}
          </div>
          <span className={isActive ? "font-bold" : ""}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function MobileMenu() {
  const { user, signOut } = useAuth();
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
        <NavLink to="/help" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted">
          Help & Support
        </NavLink>
      </nav>
      {user && (
        <button onClick={signOut} className="m-3 p-3 flex items-center gap-2 rounded-lg bg-muted text-sm font-semibold">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      )}
    </div>
  );
}