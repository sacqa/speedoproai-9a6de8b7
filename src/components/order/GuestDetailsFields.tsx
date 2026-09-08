import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, User } from "lucide-react";
import type { GuestInfo } from "@/lib/guestOrder";
import { useDeliveryZones, slugifyArea } from "@/lib/deliveryRules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationButton } from "@/components/order/LocationButton";
import { useState } from "react";

type Props = {
  value: GuestInfo;
  onChange: (v: GuestInfo) => void;
};

/** Name / phone / area / address block shared by every checkout in the app. */
export function GuestDetailsFields({ value, onChange }: Props) {
  const set = (patch: Partial<GuestInfo>) => onChange({ ...value, ...patch });
  const zones = useDeliveryZones();
  const hasZones = (zones.data?.length ?? 0) > 0;
  const listed = hasZones && zones.data!.some((z) => slugifyArea(z.area) === slugifyArea(value.area));
  const [manual, setManual] = useState(!!value.area && hasZones && !listed);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="g-name" className="text-[13px] font-semibold flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> Your name
        </Label>
        <Input
          id="g-name" autoComplete="name" placeholder="e.g. Ahmed Khan" className="mt-1.5 h-11"
          value={value.name} onChange={(e) => set({ name: e.target.value.slice(0, 60) })}
        />
      </div>
      <div>
        <Label htmlFor="g-phone" className="text-[13px] font-semibold flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" /> Phone / WhatsApp
        </Label>
        <div className="mt-1.5 flex">
          <span className="inline-flex items-center px-3 h-11 rounded-l-md border border-r-0 border-input bg-muted text-xs font-semibold">+92</span>
          <Input
            id="g-phone" inputMode="numeric" autoComplete="tel" maxLength={11} placeholder="03xx xxxxxxx"
            className="h-11 rounded-l-none"
            value={value.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="g-area" className="text-[13px] font-semibold flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Area / town
          </Label>
          {hasZones && (
            <button
              type="button"
              onClick={() => { setManual(!manual); set({ area: "" }); }}
              className="text-[11.5px] font-semibold text-primary hover:underline"
            >
              {manual ? "Choose from list" : "My area isn't listed"}
            </button>
          )}
        </div>
        {hasZones && !manual ? (
          <Select value={listed ? value.area : ""} onValueChange={(v) => set({ area: v })}>
            <SelectTrigger id="g-area" className="mt-1.5 h-11"><SelectValue placeholder="Choose your delivery area" /></SelectTrigger>
            <SelectContent>
              {zones.data!.map((z) => (
                <SelectItem key={z.id} value={z.area}>{z.area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="g-area" className="mt-1.5 h-11" placeholder="Type your area, e.g. Dipalpur"
            value={value.area} onChange={(e) => set({ area: e.target.value.slice(0, 60) })}
          />
        )}
      </div>
      <div>
        <Label htmlFor="g-street" className="text-[13px] font-semibold flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Delivery address
        </Label>
        <Textarea
          id="g-street" className="mt-1.5 min-h-[72px] resize-none" placeholder="House #, street, landmark"
          value={value.street} onChange={(e) => set({ street: e.target.value.slice(0, 200) })}
        />
      </div>
      <LocationButton value={value.geo ?? null} onChange={(g) => set({ geo: g })} />
    </div>
  );
}
