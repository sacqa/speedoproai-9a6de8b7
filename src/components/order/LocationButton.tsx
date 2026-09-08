import { Button } from "@/components/ui/button";
import { Crosshair, Check, Loader2 } from "lucide-react";
import { useCurrentLocation, mapsLink, type GeoPoint } from "@/lib/geo";
import { toast } from "sonner";

type Props = {
  value?: GeoPoint | null;
  onChange: (g: GeoPoint | null) => void;
};

/** "Use my current location" — pins the exact spot so the rider/admin sees it live. */
export function LocationButton({ value, onChange }: Props) {
  const { request, busy, error } = useCurrentLocation();

  const pick = async () => {
    const g = await request();
    if (g) {
      onChange(g);
      toast.success("Location pinned — our team can see your exact spot.");
    } else if (error) {
      toast.error(error);
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" size="sm" variant={value ? "outline" : "default"} onClick={pick} disabled={busy} className="rounded-full h-9">
          {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : value ? <Check className="h-4 w-4 mr-1.5" /> : <Crosshair className="h-4 w-4 mr-1.5" />}
          {busy ? "Getting location…" : value ? "Location pinned" : "Use my current location"}
        </Button>
        {value && (
          <a href={mapsLink(value)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
            View on map
          </a>
        )}
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:underline">
            Remove
          </button>
        )}
      </div>
      <p className="text-[11.5px] text-muted-foreground">
        {value
          ? `Pinned at ${value.lat}, ${value.lng}${value.accuracy ? ` (±${value.accuracy} m)` : ""}. This helps the rider find you faster.`
          : "Optional — share your exact spot so the rider reaches you without calling."}
      </p>
    </div>
  );
}
