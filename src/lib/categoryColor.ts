// Deterministic category color picker. Returns Tailwind-safe utility classes
// (bg + text + border) for soft "tint" badges in the customer app.
const PALETTE = [
  { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-100",  dot: "bg-emerald-500"  },
  { bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-100",     dot: "bg-blue-500"     },
  { bg: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-100",   dot: "bg-orange-500"   },
  { bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-100",     dot: "bg-rose-500"     },
  { bg: "bg-violet-50",   text: "text-violet-700",   border: "border-violet-100",   dot: "bg-violet-500"   },
  { bg: "bg-amber-50",    text: "text-amber-800",    border: "border-amber-100",    dot: "bg-amber-500"    },
  { bg: "bg-cyan-50",     text: "text-cyan-700",     border: "border-cyan-100",     dot: "bg-cyan-500"     },
  { bg: "bg-fuchsia-50",  text: "text-fuchsia-700",  border: "border-fuchsia-100",  dot: "bg-fuchsia-500"  },
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function categoryColor(key?: string | null) {
  if (!key) return PALETTE[0];
  return PALETTE[hash(key) % PALETTE.length];
}