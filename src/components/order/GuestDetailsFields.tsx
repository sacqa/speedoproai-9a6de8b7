import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, User } from "lucide-react";
import type { GuestInfo } from "@/lib/guestOrder";

type Props = {
  value: GuestInfo;
  onChange: (v: GuestInfo) => void;
};

/** Name / phone / area / address block shared by every checkout in the app. */
export function GuestDetailsFields({ value, onChange }: Props) {
  const set = (patch: Partial<GuestInfo>) => onChange({ ...value, ...patch });
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
        <Label htmlFor="g-area" className="text-[13px] font-semibold flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Area / town
        </Label>
        <Input
          id="g-area" className="mt-1.5 h-11" placeholder="e.g. Dipalpur"
          value={value.area} onChange={(e) => set({ area: e.target.value.slice(0, 60) })}
        />
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
    </div>
  );
}
