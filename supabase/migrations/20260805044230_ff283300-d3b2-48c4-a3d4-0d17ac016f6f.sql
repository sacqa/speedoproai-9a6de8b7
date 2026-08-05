ALTER TABLE public.guest_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_orders;