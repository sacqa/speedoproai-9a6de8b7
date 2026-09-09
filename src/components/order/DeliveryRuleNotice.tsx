import { AlertTriangle, Clock, Truck } from "lucide-react";
import { formatPKR } from "@/lib/format";
import type { DeliveryQuote } from "@/lib/deliveryRules";

/** Shows the active area's minimum order, fee and delivery window at checkout. */
export function DeliveryRuleNotice({ quote, showMinimum = true }: { quote: DeliveryQuote; showMinimum?: boolean }) {
  const { zone, blockedReason } = quote;
  return (
    <div className="space-y-2">
      {zone && (
        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1.5 text-[12.5px]">
          <div className="flex items-center gap-2 font-semibold">
            <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{zone.area}</span>
            <span className="text-muted-foreground font-normal">
              · {quote.fee === 0 ? "Free delivery" : formatPKR(quote.fee)}
            </span>
          </div>
          {showMinimum && quote.minOrder > 0 && (
            <div className="text-muted-foreground">
              Minimum order {formatPKR(quote.minOrder)}
              {quote.freeThreshold != null && ` · free delivery over ${formatPKR(quote.freeThreshold)}`}
            </div>
          )}
        </div>
      )}
      {blockedReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 text-destructive p-3 text-[12.5px] font-semibold flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-[1px]" />
          <span>{blockedReason}</span>
        </div>
      )}
    </div>
  );
}
