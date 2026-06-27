import { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Home, Search, ShoppingCart, User, Bell, MapPin, ChevronDown, Menu,
  ShoppingBasket, Pill, Package, UtensilsCrossed, ClipboardList, LogOut,
  Mic, Settings, Shield,
} from "lucide-react";
import { SpeedoLogo, SpeedoWordmark } from "@/components/speedo/SpeedoLogo";
import { useCart } from "@/store/cart";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/format";
import { AnnouncementPopup } from "@/components/app/AnnouncementPopup";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsLoader } from "@/components/app/AnalyticsLoader";
import { MobilePermissions } from "@/components/app/MobilePermissions";
import { useLocationTracker } from "@/hooks/useLocationTracker";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useGridSettings } from "@/hooks/useGridSettings";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/speedmart", label: "SpeedMart", icon: ShoppingBasket },
  { to: "/pharmacy", label: "Pharmacy", icon: Pill },
  { to: "/speedsend", label: "SpeedSend", icon: Package },
  { to: "/food", label: "Food", icon: UtensilsCrossed },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: User },
];

// Desktop left-rail icon nav. Collapsed by default, expands on hover to reveal labels.
const railItems: { to: string; label: string; icon: typeof Home; tint: string }[] = [
  { to: "/speedmart",  label: "SpeedMart", icon: ShoppingBasket,   tint: "from-emerald-400/20 to-emerald-500/10" },
  { to: "/food",       label: "Food",      icon: UtensilsCrossed,  tint: "from-orange-400/20 to-rose-500/10" },
  { to: "/pharmacy",   label: "Pharmacy",  icon: Pill,             tint: "from-sky-400/20 to-cyan-500/10" },
  { to: "/speedsend",  label: "SpeedSend", icon: Package,          tint: "from-violet-400/20 to-fuchsia-500/10" },
  { to: "/profile",    label: "Profile",   icon: User,             tint: "from-amber-400/20 to-yellow-500/10" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const cartQty = useCart((s) => s.totalQty());
  const cartSubtotal = useCart((s) => s.subtotal());
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const { Banner } = useRealtimeNotifications();
  useGridSettings();
  useLocationTracker();
  const hideChrome = ["/login", "/otp", "/onboarding", "/splash", "/admin"].some((p) => location.pathname.startsWith(p));
  const hideCheckoutBar = ["/cart", "/checkout", "/order", "/product", "/login", "/splash", "/onboarding"].some((p) => location.pathname.startsWith(p));

  if (hideChrome) {
    return <main className="min-h-screen bg-background">{Banner}<AnalyticsLoader /><AnnouncementPopup /><InstallPrompt /><MobilePermissions />{children}</main>;
  }

  return (
    <div className="min-h-screen bg-page-gradient lg:bg-[#fafaf7]">
      <AnalyticsLoader />
      {Banner}
      <AnnouncementPopup />
      <InstallPrompt />
      <MobilePermissions />
      {/* ===== DESKTOP HEADER — Editorial w/ creative search & profile ===== */}
      <header className="hidden lg:block sticky top-0 z-40 bg-[#fafaf7]/85 backdrop-blur-md border-b border-[#e8e4dd]">
        <div className="pl-[104px] pr-8 xl:pr-12 py-3.5 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <SpeedoLogo size={30} />
            <span className="text-2xl font-serif tracking-tight text-primary">Speedo</span>
          </Link>

          {/* Creative search bar (Almeera-inspired layout) */}
          <Link
            to="/search"
            className="group flex-1 max-w-3xl flex items-center gap-3 h-14 pl-3 pr-2 rounded-full bg-white border border-[#e8e4dd] hover:border-primary/50 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)] hover:shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.35)] transition-all"
          >
            <span className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-dark text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
              <Search className="h-[18px] w-[18px]" strokeWidth={2.6} />
            </span>
            <span className="text-[15px] text-muted-foreground flex-1 truncate font-medium">
              Search groceries, food, medicine…
            </span>
            <div className="hidden xl:flex items-center gap-1 text-[10px] font-bold tracking-wider text-muted-foreground/70 border border-[#e8e4dd] rounded-md px-1.5 py-0.5">
              ⌘K
            </div>
            <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
              <Mic className="h-4 w-4 text-primary" />
            </span>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 mr-1 text-xs text-[#1a1a1a]/70">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">Dipalpur</span>
              <ChevronDown className="h-3 w-3" />
            </div>
            <Link to="/notifications" className="p-2 rounded-full hover:bg-[#efece6] transition-colors" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <Link to="/cart" className="p-2 rounded-full hover:bg-[#efece6] transition-colors relative" aria-label="Cart">
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartQty > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                  {cartQty}
                </span>
              )}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account"
                    className="ml-1 h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-bold text-sm flex items-center justify-center ring-2 ring-white shadow-sm hover:scale-105 transition-transform"
                  >
                    {(user.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase()
                      ?? user.email?.[0]?.toUpperCase()
                      ?? "S"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-xs text-muted-foreground">Signed in as</div>
                    <div className="font-bold truncate">{user.user_metadata?.full_name || user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/profile"><User className="h-4 w-4 mr-2" />Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/orders"><ClipboardList className="h-4 w-4 mr-2" />My orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/addresses"><MapPin className="h-4 w-4 mr-2" />Addresses</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/help"><Settings className="h-4 w-4 mr-2" />Help & settings</Link></DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Shield className="h-4 w-4 mr-2" />Admin panel</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="ml-2">
                <Button size="sm" className="rounded-full bg-primary hover:bg-primary-dark text-xs uppercase tracking-wider px-4">Login</Button>
              </Link>
            )}
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
      <main className="lg:pt-0 pb-32 lg:pb-12 lg:pl-[88px]">
        <DesktopRail />
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
            <BottomTab to={user ? "/profile" : "/login"} icon={User} label={user ? "Profile" : "More"} />
          </div>
        </div>
      </nav>

      {/* PROCEED TO CHECKOUT STICKY BAR */}
      {cartQty > 0 && !hideCheckoutBar && (
        <Link
          to="/cart"
          className="fixed left-1/2 -translate-x-1/2 bottom-28 lg:bottom-6 z-50 w-[92%] max-w-md flex items-center justify-between gap-3 btn-glossy px-4 py-3 hover:scale-[1.02] transition-transform"
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

/**
 * Desktop left rail: icon-only by default, expands on hover to reveal labels
 * with a soft pastel pill background per item. Fixed to viewport so it stays
 * visible while scrolling.
 */
function DesktopRail() {
  return (
    <aside
      className="hidden lg:flex group/rail fixed top-[68px] bottom-0 left-0 z-30 w-[72px] hover:w-56 transition-[width] duration-300 ease-out
                 flex-col gap-1 py-5 px-3
                 bg-white/70 backdrop-blur-xl border-r border-[#e8e4dd] shadow-[2px_0_24px_-18px_rgba(0,0,0,0.25)]"
      aria-label="Primary"
    >
      {railItems.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) =>
            `relative flex items-center gap-3 h-12 rounded-2xl px-3 overflow-hidden
             transition-all duration-300
             ${isActive
               ? "bg-gradient-to-r " + it.tint + " text-primary shadow-sm ring-1 ring-primary/15"
               : "text-[#1a1a1a]/75 hover:bg-[#efece6]"}`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all
                                ${isActive ? "bg-white/80 ring-1 ring-white shadow-sm" : "bg-white/60 group-hover/rail:bg-white"}`}>
                <it.icon className={`h-[19px] w-[19px] ${isActive ? "text-primary" : ""}`} strokeWidth={2.3} />
              </span>
              <span className="whitespace-nowrap text-sm font-semibold tracking-tight
                               opacity-0 -translate-x-1 group-hover/rail:opacity-100 group-hover/rail:translate-x-0
                               transition-all duration-300">
                {it.label}
              </span>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
              )}
            </>
          )}
        </NavLink>
      ))}
      <div className="mt-auto pt-3 border-t border-[#ece8e0]">
        <div className="flex items-center gap-3 h-10 px-3 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 whitespace-nowrap
                        opacity-0 group-hover/rail:opacity-100 transition-opacity">
          Speedo · v1
        </div>
      </div>
    </aside>
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