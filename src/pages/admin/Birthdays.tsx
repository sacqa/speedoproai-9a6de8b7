import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Cake, PartyPopper } from "lucide-react";

type Profile = { id: string; full_name: string | null; phone: string | null; dob: string | null };

const monthName = (m: number) =>
  ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m];

function daysUntilBirthday(dob: string, today: Date): number {
  const d = new Date(dob);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  return Math.round((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
}

export default function Birthdays() {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["admin", "birthdays"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, dob")
        .not("dob", "is", null)
        .limit(1000);
      return (data ?? []) as Profile[];
    },
  });

  const today = new Date();
  const todayD = today.getDate();
  const todayM = today.getMonth();

  const { todayList, upcoming } = useMemo(() => {
    const filtered = (q.data ?? []).filter((p) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (p.full_name ?? "").toLowerCase().includes(s) || (p.phone ?? "").includes(s);
    });
    const todayList = filtered.filter((p) => {
      if (!p.dob) return false;
      const d = new Date(p.dob);
      return d.getDate() === todayD && d.getMonth() === todayM;
    });
    const upcoming = filtered
      .filter((p) => p.dob && !(new Date(p.dob).getDate() === todayD && new Date(p.dob).getMonth() === todayM))
      .map((p) => ({ ...p, days: daysUntilBirthday(p.dob!, today) }))
      .filter((p) => p.days <= 30)
      .sort((a, b) => a.days - b.days);
    return { todayList, upcoming };
  }, [q.data, search, todayD, todayM]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Cake className="h-6 w-6 text-primary" /> Birthdays
        </h1>
        <p className="text-sm text-muted-foreground">Day-wise customer birthday tracking.</p>
      </div>

      <Input
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 font-bold mb-3">
          <PartyPopper className="h-5 w-5 text-amber-500" /> Today&apos;s birthdays ({todayList.length})
        </div>
        {todayList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No birthdays today.</p>
        ) : (
          <ul className="space-y-2">
            {todayList.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <div>
                  <Link to={`/admin/customers/${p.id}`} className="font-semibold text-primary hover:underline">
                    Today is {p.full_name ?? "this customer"}&apos;s birthday 🎉
                  </Link>
                  <div className="text-xs text-muted-foreground">{p.phone ?? "—"}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <div className="px-4 py-3 border-b border-border font-bold">Upcoming (next 30 days)</div>
        {upcoming.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No upcoming birthdays.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-3">Customer</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Birthday</th>
                <th className="text-right p-3">In</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((p) => {
                const d = new Date(p.dob!);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-semibold">
                      <Link to={`/admin/customers/${p.id}`} className="text-primary hover:underline">
                        {p.full_name ?? "—"}
                      </Link>
                    </td>
                    <td>{p.phone ?? "—"}</td>
                    <td>{monthName(d.getMonth())} {d.getDate()}</td>
                    <td className="text-right p-3 text-xs font-semibold">{p.days} day{p.days === 1 ? "" : "s"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}