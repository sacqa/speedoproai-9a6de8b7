import { Check, Clock } from "lucide-react";

export type StepDef = { key: string; label: string; hint?: string };

/**
 * Horizontal steps progress indicator used during checkout and on the
 * order confirmation screen. `current` is the zero-based index of the
 * step in progress; every earlier step renders as completed.
 */
export function OrderSteps({
  steps,
  current,
  eta,
  title,
}: {
  steps: StepDef[];
  current: number;
  eta?: string | null;
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <div className="text-sm font-bold">{title ?? "Order progress"}</div>
          <div className="text-[11.5px] text-muted-foreground">
            Step {Math.min(current + 1, steps.length)} of {steps.length} · {steps[Math.min(current, steps.length - 1)]?.label}
          </div>
        </div>
        {eta && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-[11.5px] font-bold">
            <Clock className="h-3.5 w-3.5" />
            Est. delivery {eta}
          </div>
        )}
      </div>

      <ol className="flex items-start">
        {steps.map((s, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <li key={s.key} className="flex-1 min-w-0 flex flex-col items-center relative">
              {idx > 0 && (
                <span
                  aria-hidden
                  className={`absolute top-3.5 right-1/2 left-[-50%] h-[3px] rounded-full ${
                    done || active ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
              <span
                className={`relative z-10 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold ring-4 ring-card transition-colors ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary/15 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : idx + 1}
              </span>
              <span
                className={`mt-1.5 text-center text-[10.5px] sm:text-[11.5px] leading-tight px-0.5 ${
                  active ? "font-bold text-foreground" : done ? "font-semibold text-foreground/80" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {s.hint && <span className="hidden sm:block text-[10px] text-muted-foreground text-center">{s.hint}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export const CHECKOUT_STEPS: StepDef[] = [
  { key: "basket", label: "Basket" },
  { key: "details", label: "Your details" },
  { key: "payment", label: "Payment" },
  { key: "placed", label: "Placed" },
];

export const FULFILMENT_STEPS: StepDef[] = [
  { key: "placed", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "packing", label: "Packing" },
  { key: "on_the_way", label: "On the way" },
  { key: "delivered", label: "Delivered" },
];

/** Rough same-day promise: 45 minutes from the given time. */
export function etaLabel(from: Date = new Date(), minutes = 45) {
  const d = new Date(from.getTime() + minutes * 60_000);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}