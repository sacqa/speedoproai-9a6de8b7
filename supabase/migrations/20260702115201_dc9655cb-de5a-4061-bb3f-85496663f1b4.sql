-- 1. Harden has_role: only answer about the caller themselves
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 2. Admin-only helper for looking up other users' roles (used by admin UIs / edge functions)
CREATE OR REPLACE FUNCTION public.admin_check_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_check_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_check_role(uuid, app_role) TO authenticated, service_role;

-- 3. Defense-in-depth: revoke commission_percent from anon/authenticated explicitly
REVOKE SELECT (commission_percent) ON public.food_vendors FROM anon, authenticated, PUBLIC;
