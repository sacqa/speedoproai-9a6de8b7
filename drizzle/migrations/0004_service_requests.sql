CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('plumber','electrician','ac_technician','cleaner','mobile_repair','appliance_repair','carpenter','painter','mechanic','computer_repair','other')),
  description text NOT NULL CHECK (length(description) BETWEEN 5 AND 1000),
  customer_name text NOT NULL CHECK (length(customer_name) BETWEEN 2 AND 60),
  phone text NOT NULL CHECK (phone ~ '^03\d{9}$'),
  area text NOT NULL CHECK (length(area) BETWEEN 2 AND 60),
  address text NOT NULL CHECK (length(address) BETWEEN 2 AND 200),
  geo jsonb,
  preferred_at text CHECK (preferred_at IS NULL OR length(preferred_at) <= 40),
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low','normal','urgent')),
  attachment_url text CHECK (attachment_url IS NULL OR length(attachment_url) <= 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
  provider_name text,
  provider_phone text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.service_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit service request" ON public.service_requests FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND provider_name IS NULL AND provider_phone IS NULL AND admin_notes IS NULL);
CREATE POLICY "Admins read service requests" ON public.service_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins update service requests" ON public.service_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins delete service requests" ON public.service_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_service_requests_updated BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();