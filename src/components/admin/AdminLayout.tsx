import { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag, Users, Image as ImageIcon,
  DollarSign, LogOut, Menu, Megaphone, MessageSquare, Sparkles, UtensilsCrossed,
} from "lucide-react";
import { SpeedoLogo } from "@/components/speedo/SpeedoLogo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAdminOrderAlert } from "@/hooks/useAdminOrderAlert";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/food-vendors", label: "Food Vendors", icon: UtensilsCrossed },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/pricing", label: "Pricing Rules", icon: DollarSign },
  { to: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
  { to: "/admin/announcements", label: "Announcements", icon: Sparkles },
  { to: "/admin/replies", label: "Replies", icon: MessageSquare },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  useAdminOrderAlert(true);
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 h-14 glass border-b border-white/40 flex items-center px-4 gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <button className="lg:hidden p-1.5 -ml-1.5"><Menu className="h-5 w-5" /></button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarBody pathname={location.pathname} />
          </SheetContent>
        </Sheet>
        <Link to="/admin" className="flex items-center gap-2">
          <SpeedoLogo size={28} />
          <span className="font-extrabold">Speedo <span className="text-primary">Admin</span></span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/" className="text-xs font-semibold text-primary hover:underline hidden sm:inline">View customer app →</Link>
          <span className="text-xs text-muted-foreground hidden md:inline">{user?.email}</span>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" />Logout
          </Button>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden lg:block w-60 shrink-0 border-r border-white/40 glass min-h-[calc(100vh-3.5rem)]">
          <SidebarBody pathname={location.pathname} />
        </aside>
        <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({ pathname }: { pathname: string }) {
  return (
    <nav className="p-3 space-y-1">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
            }`
          }
        >
          <it.icon className="h-4 w-4" />
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}