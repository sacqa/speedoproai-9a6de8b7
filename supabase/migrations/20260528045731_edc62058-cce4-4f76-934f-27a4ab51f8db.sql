
-- Seed the auto-approval flag (off by default)
INSERT INTO public.pricing_rules (key, value, description)
SELECT 'auto_approve_users', 0, 'Auto-approve customer signups (1 = on, 0 = off)'
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_rules WHERE key = 'auto_approve_users');

-- Secure function: customer can approve self only if admin enabled auto-approval
CREATE OR REPLACE FUNCTION public.try_auto_approve_self()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v numeric;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT value INTO v FROM public.pricing_rules WHERE key = 'auto_approve_users' LIMIT 1;
  IF COALESCE(v, 0) < 1 THEN RETURN false; END IF;
  UPDATE public.profiles
     SET approval_status = 'approved', approved_at = now()
   WHERE id = uid AND approval_status = 'pending';
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.try_auto_approve_self() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_auto_approve_self() TO authenticated;
