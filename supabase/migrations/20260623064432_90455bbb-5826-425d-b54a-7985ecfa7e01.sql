
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  hero_image_url text,
  content text NOT NULL DEFAULT '',
  meta_description text,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published pages"
  ON public.cms_pages FOR SELECT
  USING (is_published OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pages"
  ON public.cms_pages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pages"
  ON public.cms_pages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pages"
  ON public.cms_pages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cms_pages_updated
  BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the 5 default pages with starter copy admins can edit.
INSERT INTO public.cms_pages (slug, title, subtitle, content, meta_description) VALUES
  ('about', 'About Speedo', 'Hyperlocal delivery, built for Dipalpur.',
    E'## Our mission\n\nSpeedo brings groceries, medicines, restaurant food and parcel delivery to every doorstep in Dipalpur — fast, friendly, and fairly priced.\n\n## Why people choose Speedo\n\n- Fast hyperlocal delivery\n- Trusted local partners and vendors\n- Transparent pricing — no hidden fees\n- Friendly customer support in your language\n\n_Admin: edit this content from the Admin Panel → Pages._',
    'Speedo is a hyperlocal delivery app serving Dipalpur with groceries, pharmacy, restaurant food and parcels.'),
  ('contact', 'Contact us', 'We''re here to help.',
    E'## Get in touch\n\n- **WhatsApp / Phone:** +92 300 0000000\n- **Email:** hello@speedo.app\n- **Address:** Main Bazaar, Dipalpur, Punjab, Pakistan\n\n## Support hours\n\nEvery day, 8:00 AM – 11:00 PM.\n\n_Admin: edit this content from the Admin Panel → Pages._',
    'Reach the Speedo team for delivery, vendor or partnership questions.'),
  ('careers', 'Careers at Speedo', 'Help us build the future of hyperlocal delivery.',
    E'## Open roles\n\n- Delivery Riders (Dipalpur)\n- Customer Support Associate\n- Vendor Partnerships Manager\n\n## How to apply\n\nSend your CV to **careers@speedo.app** with the role in the subject line.\n\n_Admin: edit this content from the Admin Panel → Pages._',
    'Join the Speedo team — we''re hiring riders, support and partnerships in Dipalpur.'),
  ('privacy', 'Privacy Policy', 'How we handle your information.',
    E'_Last updated: today_\n\n## What we collect\n\nWe collect the information you provide (name, phone, address, order details) and basic usage data needed to run Speedo.\n\n## How we use it\n\n- Fulfilling and delivering your orders\n- Customer support and account safety\n- Improving the Speedo experience\n\n## Your choices\n\nYou can update your profile or request deletion at any time by contacting support.\n\n_Admin: edit this content from the Admin Panel → Pages._',
    'Speedo''s privacy policy: what data we collect, how we use it, and your rights.'),
  ('terms', 'Terms of Service', 'The rules for using Speedo.',
    E'_Last updated: today_\n\n## Using Speedo\n\nBy using Speedo you agree to provide accurate information and follow local laws.\n\n## Orders & payments\n\nOrder totals, delivery fees and taxes are shown at checkout. Refunds follow our standard policy.\n\n## Vendors & content\n\nProducts and prices come from our partner vendors and can change without notice.\n\n## Contact\n\nQuestions? Email **support@speedo.app**.\n\n_Admin: edit this content from the Admin Panel → Pages._',
    'Speedo terms of service: orders, payments, vendors, accounts and contact.');

-- Realtime: live updates for CMS pages, app settings and banners.
ALTER PUBLICATION supabase_realtime ADD TABLE public.cms_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
