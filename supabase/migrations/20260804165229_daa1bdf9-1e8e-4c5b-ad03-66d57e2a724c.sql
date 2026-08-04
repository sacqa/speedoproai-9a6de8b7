DROP POLICY IF EXISTS "update own profile" ON public.profiles;

CREATE POLICY "update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service_role / triggers / definer functions
  END IF;

  NEW.approval_status := OLD.approval_status;
  NEW.is_banned       := OLD.is_banned;
  NEW.approved_at     := OLD.approved_at;
  NEW.approved_by     := OLD.approved_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();