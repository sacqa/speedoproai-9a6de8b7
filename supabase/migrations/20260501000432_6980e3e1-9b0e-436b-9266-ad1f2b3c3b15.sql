-- Notification replies: users reply to a notification banner; admins read all
CREATE TABLE public.notification_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own replies"
ON public.notification_replies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own replies"
ON public.notification_replies
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage replies"
ON public.notification_replies
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_notification_replies_created ON public.notification_replies (created_at DESC);
CREATE INDEX idx_notification_replies_unread ON public.notification_replies (is_read, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_replies;