import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Notifications() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["notif", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  useEffect(() => {
    if (user) supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false).then(() => {});
  }, [user]);
  return (
    <div className="p-4 lg:p-0 space-y-2">
      <h1 className="text-2xl font-extrabold mb-2">Notifications</h1>
      {(q.data ?? []).length === 0 ? <p className="text-muted-foreground py-8 text-center">Nothing here yet.</p> :
        (q.data ?? []).map((n: any) => (
          <div key={n.id} className="bg-card rounded-xl shadow-card p-4">
            <div className="font-semibold text-sm">{n.title}</div>
            <div className="text-xs text-muted-foreground">{n.message}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
    </div>
  );
}