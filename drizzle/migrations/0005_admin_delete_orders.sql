CREATE OR REPLACE FUNCTION public.admin_delete_orders(_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  DELETE FROM public.notification_replies WHERE order_id = ANY(_ids);
  DELETE FROM public.notifications WHERE order_id = ANY(_ids);
  DELETE FROM public.order_instructions WHERE order_id = ANY(_ids);
  DELETE FROM public.order_status_logs WHERE order_id = ANY(_ids);
  DELETE FROM public.order_items WHERE order_id = ANY(_ids);
  DELETE FROM public.orders WHERE id = ANY(_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.guest_orders WHERE id = ANY(_ids);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.admin_delete_orders(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_orders(uuid[]) TO authenticated;