-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    active, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    CONCAT(
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'first_name' IS NOT NULL 
        AND NEW.raw_user_meta_data ->> 'last_name' IS NOT NULL 
        THEN ' ' 
        ELSE '' 
      END,
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
    ),
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user_profiles when auth.users is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();