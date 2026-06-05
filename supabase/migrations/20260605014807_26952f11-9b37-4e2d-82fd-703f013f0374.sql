
CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  target_id uuid,
  target_label text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "service inserts audit" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.app_settings (key, value) VALUES
  ('footer', '{"brand_tagline":"Hyperlocal delivery in Dipalpur, Pakistan.","company_links":[{"label":"About","url":"#"},{"label":"Contact","url":"#"},{"label":"Careers","url":"#"}],"legal_links":[{"label":"Privacy Policy","url":"#"},{"label":"Terms of Service","url":"#"}],"app_note":"Install Speedo from your browser menu → Add to Home Screen.","copyright":"© Speedo"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
