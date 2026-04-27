import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin, ClipboardList, Bell, HelpCircle, LogOut } from "lucide-react";

export default function Profile() {
  const { user, signOut } = useAuth();
  return (
    <div className="p-4 lg:p-0 space-y-4 max-w-md mx-auto">
      <div className="bg-card rounded-xl shadow-card p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full gradient-primary text-white flex items-center justify-center text-xl font-extrabold">
          {user?.user_metadata?.full_name?.[0]?.toUpperCase() ?? "S"}
        </div>
        <div>
          <div className="font-bold">{user?.user_metadata?.full_name || "Speedo Customer"}</div>
          <div className="text-sm text-muted-foreground">{user?.user_metadata?.phone ? `+92 ${user.user_metadata.phone}` : user?.email}</div>
        </div>
      </div>
      <div className="bg-card rounded-xl shadow-card divide-y divide-border">
        {[
          { to: "/orders", icon: ClipboardList, label: "My Orders" },
          { to: "/addresses", icon: MapPin, label: "Saved Addresses" },
          { to: "/notifications", icon: Bell, label: "Notifications" },
          { to: "/help", icon: HelpCircle, label: "Help & Support" },
        ].map((r) => (
          <Link key={r.to} to={r.to} className="flex items-center gap-3 p-4">
            <r.icon className="h-5 w-5 text-primary" />
            <span className="flex-1 font-semibold text-sm">{r.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <Button variant="outline" className="w-full h-12 rounded-pill" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Logout
      </Button>
    </div>
  );
}