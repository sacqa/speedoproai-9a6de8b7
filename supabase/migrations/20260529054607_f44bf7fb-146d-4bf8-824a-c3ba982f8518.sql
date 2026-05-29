
-- 1) Remove profiles from realtime publication (phone/dob exposure)
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;

-- 2) Explicit restrictive INSERT policy on user_roles to prevent self-elevation.
-- Drop the existing combined ALL policy and split into per-command policies
-- so INSERT enforces WITH CHECK admin-only.
DROP POLICY IF EXISTS "admin manage roles" ON public.user_roles;

CREATE POLICY "admins select all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "admins insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "admins update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "admins delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));
