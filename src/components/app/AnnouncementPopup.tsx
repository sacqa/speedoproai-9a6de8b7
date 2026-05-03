import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Announcement = {
  id: string; title: string; message: string;
  image_url: string | null; cta_label: string | null; cta_url: string | null;
  expires_at: string | null;
};

export function AnnouncementPopup() {
  const { user } = useAuth();
  const [item, setItem] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data: anns } = await supabase
        .from("announcements")
        .select("id,title,message,image_url,cta_label,cta_url,expires_at")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("created_at", { ascending: false });
      if (cancelled || !anns?.length) return;

      const { data: dis } = await supabase
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", user.id);
      const dismissedIds = new Set((dis ?? []).map((d: any) => d.announcement_id));
      const sessionShown = new Set(
        JSON.parse(sessionStorage.getItem("ann_shown") || "[]") as string[],
      );
      const next = anns.find((a: any) => !dismissedIds.has(a.id) && !sessionShown.has(a.id));
      if (next) {
        setItem(next as Announcement);
        sessionShown.add(next.id);
        sessionStorage.setItem("ann_shown", JSON.stringify([...sessionShown]));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const skip = async () => {
    if (!user || !item) return;
    await supabase.from("announcement_dismissals").insert({
      announcement_id: item.id, user_id: user.id,
    });
    setItem(null);
  };

  const openCta = () => {
    if (!item?.cta_url) return;
    if (/^https?:\/\//i.test(item.cta_url)) {
      window.open(item.cta_url, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(item.cta_url);
    }
    setItem(null);
  };

  if (!item) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && setItem(null)}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {item.image_url && (
          <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover" />
        )}
        <div className="p-5 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-xl">{item.title}</DialogTitle>
            <DialogDescription className="text-sm whitespace-pre-wrap">
              {item.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-pill" onClick={skip}>Skip</Button>
            {item.cta_url && (
              <Button className="flex-1 rounded-pill" onClick={openCta}>
                {item.cta_label || "Learn more"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}