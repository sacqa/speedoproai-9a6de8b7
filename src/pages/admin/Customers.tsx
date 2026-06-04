import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Cake, Trash2, UserX } from "lucide-react";
import { BirthdaysPanel } from "./Birthdays";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 25;

export default function AdminCustomers() {
  const { user } = useAuth();
  const [isSuper, setIsSuper] = useState(false);
  const [wiping, setWiping] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin")
      .maybeSingle().then(({ data }) => setIsSuper(!!data));
  }, [user]);
  const wipeAll = async () => {
    setWiping(true);
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "wipe_app_data" } });
    setWiping(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success(`Wiped ${data?.deleted_users ?? 0} customers + all orders`);
    setTimeout(() => window.location.reload(), 600);
  };
  const deleteAllUsers = async () => {
    setWiping(true);
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "delete_all_users" } });
    setWiping(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success(`Deleted ${data?.deleted ?? 0} users`);
    setTimeout(() => window.location.reload(), 600);
  };
  const deleteOne = async (uid: string, name: string) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "delete_user", user_id: uid } });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success(`Deleted ${name}`);
    q.refetch();
  };
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const tab = params.get("tab") === "birthdays" ? "birthdays" : "list";
  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => { if (v === null || v === "") p.delete(k); else p.set(k, v); });
    setParams(p, { replace: true });
  };
  const q = useQuery({
    queryKey: ["admin","customers"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
      const { data: orders } = await supabase.from("orders").select("user_id,total");
      const stats = new Map<string, { count: number; spent: number }>();
      (orders ?? []).forEach((o: any) => {
        const s = stats.get(o.user_id) ?? { count: 0, spent: 0 };
        s.count++; s.spent += Number(o.total ?? 0);
        stats.set(o.user_id, s);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, ...(stats.get(p.id) ?? { count: 0, spent: 0 }) }));
    },
  });

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    return list.filter((c: any) => {
      if (status !== "all" && c.approval_status !== status) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (c.full_name ?? "").toLowerCase().includes(s) || (c.phone ?? "").includes(s);
    });
  }, [q.data, search, status]);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-extrabold">Customers</h1>
        {isSuper && (
          <div className="flex gap-2 flex-wrap">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={wiping}>
                <Trash2 className="h-4 w-4 mr-1" />{wiping ? "Wiping…" : "Reset all customer & order data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Wipe ALL customer & order data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently deletes every non-admin customer account, their orders, addresses, chats, friendships, and locations. Admins are kept. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={wipeAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, wipe everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={wiping}>
                <UserX className="h-4 w-4 mr-1" />Delete all users
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete ALL non-admin users?</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently deletes every customer account and all of their related data. Admins are kept. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllUsers} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete all users</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        )}
      </div>
      <Tabs value={tab} onValueChange={(v) => update({ tab: v === "list" ? null : v, page: null })}>
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5"><Users className="h-4 w-4" /> All customers</TabsTrigger>
          <TabsTrigger value="birthdays" className="gap-1.5"><Cake className="h-4 w-4" /> Birthdays</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-4 mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => update({ q: e.target.value || null, page: null })}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => update({ status: v === "all" ? null : v, page: null })}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{total} match</span>
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left">Phone</th>
              <th className="text-left">Date of birth</th>
              <th className="text-left">Status</th>
              <th className="text-right">Orders</th>
              <th className="text-right p-3">Spent</th>
              <th className="text-right p-3">Joined</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c: any) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="p-3 font-semibold">
                  <Link to={`/admin/customers/${c.id}`} className="text-primary hover:underline">
                    {c.full_name ?? "—"}
                  </Link>
                </td>
                <td>{c.phone ?? "—"}</td>
                <td className="text-xs">{c.dob ? new Date(c.dob).toLocaleDateString() : "—"}</td>
                <td className="text-xs">
                  <span className={`font-semibold ${c.approval_status === "approved" ? "text-emerald-600" : c.approval_status === "rejected" ? "text-destructive" : "text-amber-600"}`}>
                    {c.approval_status}
                  </span>
                </td>
                <td className="text-right">{c.count}</td>
                <td className="text-right p-3 font-semibold">Rs {Math.round(c.spent).toLocaleString()}</td>
                <td className="text-right p-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="text-right p-3">
                  {isSuper && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {c.full_name ?? c.phone}?</AlertDialogTitle>
                          <AlertDialogDescription>Permanently deletes this customer and all their orders, chats, addresses, and friendships. Cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOne(c.id, c.full_name ?? c.phone)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete user</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No customers</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{(safePage - 1) * PAGE_SIZE + rows.length} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => update({ page: String(safePage - 1) })}>Previous</Button>
          <span className="px-2 py-1 font-semibold text-foreground">Page {safePage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => update({ page: String(safePage + 1) })}>Next</Button>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="birthdays" className="mt-4">
          <BirthdaysPanel showHeading={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}