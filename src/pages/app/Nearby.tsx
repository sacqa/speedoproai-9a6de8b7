import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, UserPlus, Check, MessageCircle, RefreshCcw } from "lucide-react";

function haversine(a: {lat:number,lng:number}, b: {lat:number,lng:number}) {
  const R = 6371000, toRad = (d:number)=>d*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

export default function Nearby() {
  const { user } = useAuth();
  const [pos, setPos] = useState<{lat:number,lng:number}|null>(null);
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);

  const askLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => toast.error(e.message || "Location denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  useEffect(() => { askLocation(); }, []);

  // Persist my location
  useEffect(() => {
    if (!pos || !user) return;
    supabase.from("user_locations").upsert({
      user_id: user.id, lat: pos.lat, lng: pos.lng, share_enabled: share, updated_at: new Date().toISOString(),
    }).then(({ error }) => { if (error) toast.error(error.message); });
  }, [pos, share, user]);

  const others = useQuery({
    queryKey: ["nearby", user?.id],
    enabled: !!user && !!pos,
    queryFn: async () => {
      const { data: locs } = await supabase.from("user_locations").select("user_id, lat, lng, updated_at").neq("user_id", user!.id);
      const ids = (locs ?? []).map((l: any) => l.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const { data: fr } = await supabase.from("friendships").select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (locs ?? []).map((l: any) => ({
        ...l, profile: map.get(l.user_id),
        distance: haversine(pos!, { lat: l.lat, lng: l.lng }),
        friendship: (fr ?? []).find((f: any) => f.requester_id === l.user_id || f.addressee_id === l.user_id),
      })).filter((x: any) => x.profile && x.distance <= 100).sort((a:any,b:any)=>a.distance-b.distance);
    },
    refetchInterval: 15000,
  });

  const sendRequest = async (otherId: string) => {
    setBusy(true);
    const { error } = await supabase.from("friendships").insert({ requester_id: user!.id, addressee_id: otherId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent"); others.refetch();
  };
  const accept = async (id: string) => {
    const { error } = await supabase.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Friend added"); others.refetch();
  };

  return (
    <div className="p-4 lg:p-0 max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-extrabold">Nearby (100m)</h1>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { askLocation(); others.refetch(); }}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>
      <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-semibold text-sm">Share my location</div>
          <div className="text-xs text-muted-foreground">
            {pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Waiting for permission…"}
          </div>
        </div>
        <Switch checked={share} onCheckedChange={setShare} />
      </div>
      {!pos && <Button onClick={askLocation} className="w-full">Allow location</Button>}
      <div className="space-y-2">
        {(others.data ?? []).length === 0 && pos && (
          <div className="text-sm text-muted-foreground text-center py-8">No one nearby yet. Pull to refresh.</div>
        )}
        {(others.data ?? []).map((u: any) => {
          const f = u.friendship;
          const isAccepted = f?.status === "accepted";
          const iSent = f && f.requester_id === user!.id && f.status === "pending";
          const theySent = f && f.addressee_id === user!.id && f.status === "pending";
          return (
            <div key={u.user_id} className="bg-card rounded-xl shadow-card p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {u.profile?.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{u.profile?.full_name ?? "User"}</div>
                <div className="text-xs text-muted-foreground">{Math.round(u.distance)} m away</div>
              </div>
              {isAccepted ? (
                <Link to={`/chat/${u.user_id}`}><Button size="sm"><MessageCircle className="h-4 w-4 mr-1" />Chat</Button></Link>
              ) : theySent ? (
                <Button size="sm" onClick={() => accept(f.id)}><Check className="h-4 w-4 mr-1" />Accept</Button>
              ) : iSent ? (
                <Button size="sm" variant="outline" disabled>Requested</Button>
              ) : (
                <Button size="sm" disabled={busy} onClick={() => sendRequest(u.user_id)}>
                  <UserPlus className="h-4 w-4 mr-1" />Add
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}