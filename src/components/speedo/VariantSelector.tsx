import { Check } from "lucide-react";

export type Variant = {
  id: string;
  name: string;
  value: string;
  price_delta: number;
  stock: number;
  is_active: boolean;
};

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: Variant[];
  selectedId?: string | null;
  onSelect: (v: Variant) => void;
}) {
  if (!variants.length) return null;

  // Group by `name` (e.g. Size, Flavor)
  const groups = new Map<string, Variant[]>();
  for (const v of variants) {
    if (!v.is_active) continue;
    const arr = groups.get(v.name) ?? [];
    arr.push(v);
    groups.set(v.name, arr);
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([groupName, opts]) => (
        <div key={groupName} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{groupName}</span>
            {selectedId && opts.find((o) => o.id === selectedId) && (
              <span className="text-xs font-semibold text-foreground">
                {opts.find((o) => o.id === selectedId)?.value}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {opts.map((v) => {
              const out = v.stock <= 0;
              const active = v.id === selectedId;
              return (
                <button
                  key={v.id}
                  disabled={out}
                  onClick={() => onSelect(v)}
                  className={`relative min-w-[64px] px-3.5 py-2.5 rounded-2xl border text-sm font-semibold transition-all
                    ${active
                      ? "bg-foreground text-background border-foreground shadow-md scale-[1.02]"
                      : out
                        ? "bg-muted/40 text-muted-foreground/50 border-border line-through cursor-not-allowed"
                        : "bg-card text-foreground border-border hover:border-foreground/40 hover:-translate-y-0.5"}
                  `}
                >
                  <span>{v.value}</span>
                  {v.price_delta !== 0 && !out && (
                    <span className={`block text-[10px] font-medium mt-0.5 ${active ? "text-background/70" : "text-muted-foreground"}`}>
                      {v.price_delta > 0 ? "+" : ""}{v.price_delta}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-accent rounded-full flex items-center justify-center shadow-sm">
                      <Check className="h-3 w-3 text-accent-foreground" strokeWidth={3} />
                    </span>
                  )}
                  {out && (
                    <span className="block text-[9px] font-bold uppercase tracking-wider mt-0.5">Sold out</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}