import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Activity, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Loc = {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  share_enabled: boolean;
  profile?: { full_name: string | null; phone: string | null; avatar_url: string | null } | null;
};

const DEFAULT_CENTER: [number, number] = [30.6708, 73.6541]; // Dipalpur

export default function AdminLiveMap() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_locations")
      .select("user_id, lat, lng, updated_at, share_enabled")
      .order("updated_at", { ascending: false });
    const rows = (data as any[]) ?? [];
    const ids = rows.map((r) => r.user_id);
    let profMap: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .in("id", ids);
      (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
    }
    setLocs(rows.map((r) => ({ ...r, profile: profMap[r.user_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-live-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => load())
      .subscribe();
    const id = setInterval(load, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(id); };
  }, []);

  const recent = useMemo(
    () => locs.filter((l) => Date.now() - new Date(l.updated_at).getTime() < 5 * 60_000),
    [locs],
  );

  const center: [number, number] = locs[0] ? [locs[0].lat, locs[0].lng] : DEFAULT_CENTER;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Live customer map</h1>
          <p className="text-sm text-muted-foreground">Realtime positions for users who shared their location.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat icon={Users} label="Sharing location" value={locs.length} />
        <Stat icon={Activity} label="Active (last 5 min)" value={recent.length} accent="text-primary" />
        <Stat icon={MapPin} label="Center" value="Dipalpur" />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="h-[520px] w-full">
          <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locs.map((l) => {
              const fresh = Date.now() - new Date(l.updated_at).getTime() < 5 * 60_000;
              return (
                <CircleMarker
                  key={l.user_id}
                  center={[l.lat, l.lng]}
                  radius={9}
                  pathOptions={{
                    color: fresh ? "#8a00d4" : "#9ca3af",
                    fillColor: fresh ? "#8a00d4" : "#9ca3af",
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">{l.profile?.full_name ?? "Customer"}</div>
                      {l.profile?.phone && <div className="text-muted-foreground">{l.profile.phone}</div>}
                      <div className="mt-1 text-muted-foreground">{new Date(l.updated_at).toLocaleString()}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className={`h-5 w-5 ${accent ?? "text-primary"}`} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </Card>
  );
}