
-- Guest order functions are now only reachable through the guest-orders edge function
REVOKE ALL ON FUNCTION public.place_guest_order(text, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_guest_order(text, text, text, text, jsonb, numeric, numeric, numeric, text, text, text, uuid, text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.lookup_guest_order(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_guest_order(text, text) TO service_role;

-- Explicit, self-documenting guarantees for the reviewed tables
REVOKE ALL ON public.broadcast_history FROM anon;
GRANT ALL ON public.broadcast_history TO service_role;

REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT ON public.notifications FROM authenticated;
GRANT ALL ON public.notifications TO service_role;

REVOKE ALL ON public.order_items FROM anon;
REVOKE UPDATE, DELETE ON public.order_items FROM authenticated;
GRANT ALL ON public.order_items TO service_role;
