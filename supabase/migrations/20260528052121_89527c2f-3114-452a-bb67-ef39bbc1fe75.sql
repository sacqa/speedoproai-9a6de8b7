-- Add date of birth to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dob date;

-- Update signup trigger to capture dob
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, dob, approval_status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'dob','')::date,
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Enable realtime for profiles so admin sees new customer joins live
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;