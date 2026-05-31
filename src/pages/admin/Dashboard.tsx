import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, statusLabel } from "@/lib/format";
import {
  Package, ShoppingBag, Users, DollarSign, TrendingUp, Clock,
  LayoutDashboard, LayoutGrid, BarChart3, ArrowUpRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type StyleKey = "classic" | "compact" | "analytics";
const STYLE_KEY = "speedo.admin.dashboardStyle";

export default function AdminDashboard() {
  const [style, setStyle] = useState<StyleKey>("analytics");
  useEffect(() => {
    const s = (localStorage.getItem(STYLE_KEY) as StyleKey) || "analytics";
    setStyle(s);
  }, []);
  const pickStyle = (s: StyleKey) => {
    setStyle(s);
    localStorage.setItem(STYLE_KEY, s);
  };

  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [orders, products, customers, recent] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id,order_number,total,status,created_at,address_snapshot").order("created_at", { ascending: false }).limit(10),
      ]);
      const all = orders.data ?? [];
      const today = new Date(); today.setHours(0,0,0,0);
      const todays = all.filter((o: any) => new Date(o.created_at) >= today);
      const revenue = all.filter((o: any) => o.status === "delivered").reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const pending = all.filter((o: any) => !["delivered","cancelled"].includes(o.status)).length;
      // Status breakdown
      const breakdown: Record<string, number> = {};
      all.forEach((o: any) => { breakdown[o.status] = (breakdown[o.status] ?? 0) + 1; });
      // 7-day sparkline of order counts
      const days: { label: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        const count = all.filter((o: any) => {
          const t = new Date(o.created_at);
          return t >= d && t < next;
        }).length;
        days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), count });
      }
      return {
        totalOrders: all.length,
        todaysOrders: todays.length,
        revenue,
        pending,
        productsCount: products.count ?? 0,
        customersCount: customers.count ?? 0,
        recent: recent.data ?? [],
        breakdown,
        days,
      };
    },
  });

  const s = stats.data;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview of your operations.</p>
        </div>
        <StyleSwitcher value={style} onChange={pickStyle} />
      </div>

      {style === "classic" && <ClassicView s={s} />}
      {style === "compact" && <CompactView s={s} />}
      {style === "analytics" && <AnalyticsView s={s} />}
    </div>
  );
}

/* ---------- Style switcher ---------- */
function StyleSwitcher({ value, onChange }: { value: StyleKey; onChange: (s: StyleKey) => void }) {
  const opts: { id: StyleKey; label: string; icon: any }[] = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "compact", label: "Compact", icon: LayoutGrid },
    { id: "classic", label: "Classic", icon: LayoutDashboard },
  ];
  return (
    <div className="inline-flex p-1 rounded-pill bg-muted border border-border">
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold transition-colors ${
              active ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <o.icon className="h-3.5 w-3.5" /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Shared bits ---------- */
function RecentOrdersTable({ rows }: { rows: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border">
          <tr><th className="text-left py-2">Order</th><th className="text-left">Customer</th><th className="text-left">Status</th><th className="text-right">Total</th><th className="text-right">When</th></tr>
        </thead>
        <tbody>
          {rows.map((o: any) => (
            <tr key={o.id} className="border-b border-border last:border-0">
              <td className="py-2"><Link to={`/admin/orders/${o.id}`} className="font-semibold text-primary">{o.order_number}</Link></td>
              <td>{o.address_snapshot?.recipient_name ?? "—"}</td>
              <td><span className="text-xs px-2 py-0.5 rounded-pill bg-muted">{statusLabel(o.status)}</span></td>
              <td className="text-right font-semibold">{formatPKR(Number(o.total))}</td>
              <td className="text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No orders yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Style 1: Classic (original layout, polished) ---------- */
function ClassicView({ s }: { s: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ClassicStat icon={ShoppingBag} label="Today's Orders" value={s?.todaysOrders ?? "—"} />
        <ClassicStat icon={DollarSign} label="Revenue (delivered)" value={s ? formatPKR(s.revenue) : "—"} />
        <ClassicStat icon={Package} label="Active Products" value={s?.productsCount ?? "—"} />
        <ClassicStat icon={Users} label="Customers" value={s?.customersCount ?? "—"} />
      </div>
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Recent Orders</h2>
          <Link to="/admin/orders" className="text-primary text-sm font-semibold">View all →</Link>
        </div>
        <RecentOrdersTable rows={s?.recent ?? []} />
      </div>
    </>
  );
}
function ClassicStat({ icon: Icon, label, value }: any) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl neu-inset text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-extrabold">{value}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Style 2: Compact (dense gradient cards + side panel) ---------- */
function CompactView({ s }: { s: any }) {
  const tiles = [
    { icon: ShoppingBag, label: "Today's Orders", value: s?.todaysOrders ?? "—", hint: `${s?.totalOrders ?? 0} total` },
    { icon: Clock, label: "Pending", value: s?.pending ?? "—", hint: "needs action" },
    { icon: DollarSign, label: "Revenue", value: s ? formatPKR(s.revenue) : "—", hint: "delivered" },
    { icon: Users, label: "Customers", value: s?.customersCount ?? "—", hint: "registered" },
    { icon: Package, label: "Products", value: s?.productsCount ?? "—", hint: "active" },
    { icon: TrendingUp, label: "Avg. order", value: s && s.totalOrders ? formatPKR(s.revenue / Math.max(1, s.totalOrders)) : "—", hint: "lifetime" },
  ];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl p-4 bg-gradient-to-br from-primary/10 via-card to-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <t.icon className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-extrabold leading-tight">{t.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.label} · <span className="opacity-70">{t.hint}</span></div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">Recent activity</h2>
          <Link to="/admin/orders" className="text-primary text-xs font-semibold">All →</Link>
        </div>
        <ul className="space-y-2">
          {(s?.recent ?? []).slice(0, 6).map((o: any) => (
            <li key={o.id}>
              <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                  #{String(o.order_number).slice(-3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{o.address_snapshot?.recipient_name ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{statusLabel(o.status)} · {new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-sm font-bold">{formatPKR(Number(o.total))}</div>
              </Link>
            </li>
          ))}
          {(!s?.recent || s.recent.length === 0) && (
            <li className="text-xs text-muted-foreground text-center py-6">No orders yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Style 3: Analytics (hero KPI + sparkline + breakdown) ---------- */
function AnalyticsView({ s }: { s: any }) {
  const max = Math.max(1, ...((s?.days ?? []).map((d: any) => d.count)));
  const breakdown = Object.entries(s?.breakdown ?? {}) as [string, number][];
  const totalForBd = breakdown.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <>
      {/* Hero KPI */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Delivered Revenue
            </div>
            <div className="text-4xl lg:text-5xl font-extrabold mt-1">{s ? formatPKR(s.revenue) : "—"}</div>
            <div className="text-sm opacity-90 mt-1">{s?.todaysOrders ?? 0} orders today · {s?.pending ?? 0} pending</div>
          </div>
          {/* Sparkline */}
          <div className="flex items-end gap-1.5 h-20">
            {(s?.days ?? []).map((d: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-5 rounded-t bg-primary-foreground/80"
                  style={{ height: `${(d.count / max) * 64 + 4}px` }}
                  title={`${d.count} orders`}
                />
                <span className="text-[10px] opacity-75">{d.label.slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi label="Total orders" value={s?.totalOrders ?? "—"} icon={ShoppingBag} />
        <MiniKpi label="Customers" value={s?.customersCount ?? "—"} icon={Users} />
        <MiniKpi label="Products" value={s?.productsCount ?? "—"} icon={Package} />
        <MiniKpi label="Pending" value={s?.pending ?? "—"} icon={Clock} tone="warning" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Recent orders */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-primary text-sm font-semibold">View all →</Link>
          </div>
          <RecentOrdersTable rows={s?.recent ?? []} />
        </div>
        {/* Status breakdown */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
          <h2 className="font-bold mb-3">Order status</h2>
          {breakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="space-y-3">
              {breakdown.map(([k, n]) => {
                const pct = Math.round((n / totalForBd) * 100);
                return (
                  <li key={k}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="capitalize">{statusLabel(k)}</span>
                      <span className="text-muted-foreground">{n} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link to="/admin/orders"><Button size="sm" variant="outline" className="w-full">Orders</Button></Link>
            <Link to="/admin/customers"><Button size="sm" variant="outline" className="w-full">Customers</Button></Link>
          </div>
        </div>
      </div>
    </>
  );
}

function MiniKpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone?: "warning" }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone === "warning" ? "text-amber-500" : "text-primary"}`} />
        {label}
      </div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}