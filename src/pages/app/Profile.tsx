import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin, ClipboardList, Bell, HelpCircle, LogOut, BellRing, KeyRound, Users, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const nav = useNavigate();
  const [tapCount, setTapCount] = useState(0);
  const push = usePushSubscription();
  const [pinOpen, setPinOpen] = useState(false);
  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confPin, setConfPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<{ full_name: string; dob: string }>({ full_name: "", dob: "" });
  const [editBusy, setEditBusy] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("full_name, dob, phone, avatar_url").eq("id", user!.id).maybeSingle()).data,
  });

  const openEdit = () => {
    setEdit({ full_name: profile.data?.full_name ?? "", dob: profile.data?.dob ?? "" });
    setEditOpen(true);
  };
  const saveProfile = async () => {
    setEditBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: edit.full_name.trim() || null,
      dob: edit.dob || null,
    }).eq("id", user!.id);
    setEditBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated"); setEditOpen(false); profile.refetch();
  };

  const changePin = async () => {
    if (!/^\d{4}$/.test(curPin)) return toast.error("Enter your current 4-digit PIN");
    if (!/^\d{4}$/.test(newPin)) return toast.error("New PIN must be 4 digits");
    if (newPin !== confPin) return toast.error("New PINs do not match");
    if (newPin === curPin) return toast.error("New PIN must be different");
    setPinBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "change_my_pin", current_pin: curPin, new_pin: newPin },
    });
    setPinBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success("PIN updated");
    setPinOpen(false); setCurPin(""); setNewPin(""); setConfPin("");
  };

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
    <div className="p-4 lg:px-8 lg:py-10 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[360px_1fr] lg:gap-8 max-w-md lg:max-w-[1100px] mx-auto">
      {/* ===== Profile hero card ===== */}
      <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-primary/15 via-white/70 to-white/40 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] p-5 lg:p-6">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="relative flex items-center gap-4 lg:flex-col lg:text-center lg:gap-3">
          <div className="h-16 w-16 lg:h-24 lg:w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl lg:text-3xl font-extrabold ring-4 ring-white/70 shadow-lg">
            {(profile.data?.full_name ?? user?.user_metadata?.full_name)?.[0]?.toUpperCase() ?? "S"}
          </div>
          <div className="flex-1 min-w-0 lg:flex-none">
            <div className="font-serif text-xl lg:text-2xl truncate">{profile.data?.full_name || user?.user_metadata?.full_name || "Speedo Customer"}</div>
            <div className="text-sm text-muted-foreground truncate">{profile.data?.phone ? `+92 ${profile.data.phone}` : user?.email}</div>
            {profile.data?.dob && <div className="text-xs text-muted-foreground mt-0.5">🎂 {new Date(profile.data.dob).toLocaleDateString()}</div>}
          </div>
          <Button size="sm" variant="outline" onClick={openEdit} className="rounded-full lg:w-full lg:mt-2">Edit profile</Button>
        </div>
      </div>
      <Button variant="outline" className="w-full h-11 rounded-full" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Logout
      </Button>
      </div>

      {/* ===== Right column ===== */}
      <div className="space-y-4">
      <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-card divide-y divide-border/60 overflow-hidden">
        {[
          { to: "/orders", icon: ClipboardList, label: "My Orders" },
          { to: "/addresses", icon: MapPin, label: "Saved Addresses" },
          { to: "/friends", icon: Users, label: "Friends & Chat" },
          { to: "/nearby", icon: UserCircle2, label: "People Nearby" },
          { to: "/notifications", icon: Bell, label: "Notifications" },
          { to: "/help", icon: HelpCircle, label: "Help & Support" },
        ].map((r) => (
          <Link key={r.to} to={r.to} className="flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors">
            <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <r.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="flex-1 font-semibold text-sm">{r.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        <Dialog open={pinOpen} onOpenChange={setPinOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-3 p-4 w-full text-left hover:bg-primary/5 transition-colors">
              <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <KeyRound className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 font-semibold text-sm">Change PIN</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Change your PIN</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="cur">Current PIN</Label>
                <Input id="cur" inputMode="numeric" type="password" maxLength={4} value={curPin}
                  onChange={(e) => setCurPin(e.target.value.replace(/\D/g, "").slice(0,4))}
                  className="mt-1.5 h-11 rounded-xl tracking-[0.5em] text-center" placeholder="••••" />
              </div>
              <div>
                <Label htmlFor="new">New PIN</Label>
                <Input id="new" inputMode="numeric" type="password" maxLength={4} value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0,4))}
                  className="mt-1.5 h-11 rounded-xl tracking-[0.5em] text-center" placeholder="••••" />
              </div>
              <div>
                <Label htmlFor="conf">Confirm new PIN</Label>
                <Input id="conf" inputMode="numeric" type="password" maxLength={4} value={confPin}
                  onChange={(e) => setConfPin(e.target.value.replace(/\D/g, "").slice(0,4))}
                  className="mt-1.5 h-11 rounded-xl tracking-[0.5em] text-center" placeholder="••••" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPinOpen(false)} disabled={pinBusy}>Cancel</Button>
              <Button onClick={changePin} disabled={pinBusy}>{pinBusy ? "Saving…" : "Update PIN"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Date of birth</Label><Input type="date" value={edit.dob} onChange={(e) => setEdit({ ...edit, dob: e.target.value })} className="mt-1.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editBusy}>Cancel</Button>
            <Button onClick={saveProfile} disabled={editBusy}>{editBusy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-card p-4 flex items-center gap-3">
        <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <BellRing className="h-[18px] w-[18px]" />
        </span>
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
      <div className="text-center pt-2">
        <button
          onClick={handleSecretTap}
          className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground tracking-widest"
          aria-label="App version"
        >
          v1.0.0{tapCount > 0 && tapCount < 5 ? ` · ${5 - tapCount}` : ""}
        </button>
      </div>
      </div>
    </div>
  );
}