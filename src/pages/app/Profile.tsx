import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin, ClipboardList, Bell, HelpCircle, LogOut, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const nav = useNavigate();
  const [tapCount, setTapCount] = useState(0);
  const push = usePushSubscription();

  const handleSecretTap = async () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setTapCount(0);
      if (isAdmin) {
        nav("/admin");
      } else {
        const { data, error } = await supabase.rpc("claim_admin_if_none");
        if (error) return toast.error(error.message);
        if (data === true) {
          toast.success("Admin access granted. Reloading…");
          setTimeout(() => window.location.reload(), 800);
        } else {
          toast.error("Access denied.");
        }
      }
    }
  };

  return (
    <div className="p-4 lg:p-0 space-y-4 max-w-md mx-auto">
      <div className="bg-card rounded-xl shadow-card p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-extrabold">
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
      <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
        <BellRing className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="font-semibold text-sm">Push Notifications</div>
          <div className="text-xs text-muted-foreground">
            {push.permission === "unsupported"
              ? "Not supported on this device"
              : push.subscribed ? "On — you'll get updates & offers" : "Off"}
          </div>
        </div>
        {push.permission !== "unsupported" && (
          <Button
            size="sm"
            variant={push.subscribed ? "outline" : "default"}
            disabled={push.busy}
            onClick={async () => {
              if (push.subscribed) { await push.unsubscribe(); toast.success("Push notifications disabled"); }
              else {
                const ok = await push.subscribe();
                if (ok) toast.success("Push notifications enabled");
                else toast.error("Permission denied");
              }
            }}
          >
            {push.subscribed ? "Disable" : "Enable"}
          </Button>
        )}
      </div>
      <Button variant="outline" className="w-full h-12 rounded-pill" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Logout
      </Button>
      <div className="text-center pt-4">
        <button
          onClick={handleSecretTap}
          className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground tracking-widest"
          aria-label="App version"
        >
          v1.0.0{tapCount > 0 && tapCount < 5 ? ` · ${5 - tapCount}` : ""}
        </button>
      </div>
    </div>
  );
}