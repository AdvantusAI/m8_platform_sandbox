-- Fix user roles system in m8_schema
-- This migration addresses the "Database error granting user" issue

-- 1. Ensure user_roles table exists in m8_schema with proper structure
CREATE TABLE IF NOT EXISTS m8_schema.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 2. Ensure user_profiles table exists in m8_schema
CREATE TABLE IF NOT EXISTS m8_schema.user_profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  first_name text,
  last_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- 3. Enable RLS on both tables
ALTER TABLE m8_schema.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create a unified role checking function that works with text roles
CREATE OR REPLACE FUNCTION m8_schema.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM m8_schema.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create a function to get user role
CREATE OR REPLACE FUNCTION m8_schema.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM m8_schema.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 6. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own roles" ON m8_schema.user_roles;
DROP POLICY IF EXISTS "Administrators can manage all roles" ON m8_schema.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON m8_schema.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view all user roles" ON m8_schema.user_roles;
DROP POLICY IF EXISTS "Authenticated users can create user roles" ON m8_schema.user_roles;
DROP POLICY IF EXISTS "Authenticated users can update user roles" ON m8_schema.user_roles;
DROP POLICY IF EXISTS "Authenticated users can delete user roles" ON m8_schema.user_roles;

DROP POLICY IF EXISTS "Users can view their own profile" ON m8_schema.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON m8_schema.user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON m8_schema.user_profiles;

-- 7. Create new, simplified RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON m8_schema.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all roles for management"
ON m8_schema.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert roles"
ON m8_schema.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update roles"
ON m8_schema.user_roles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete roles"
ON m8_schema.user_roles
FOR DELETE
TO authenticated
USING (true);

-- 8. Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON m8_schema.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles"
ON m8_schema.user_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert profiles"
ON m8_schema.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update profiles"
ON m8_schema.user_profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. Create trigger to automatically assign 'user' role to new users
CREATE OR REPLACE FUNCTION m8_schema.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default user role
  INSERT INTO m8_schema.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Insert user profile
  INSERT INTO m8_schema.user_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 10. Create trigger to assign default role when user is created
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION m8_schema.handle_new_user_role();

-- 11. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION m8_schema.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create triggers for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON m8_schema.user_roles
FOR EACH ROW
EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON m8_schema.user_profiles
FOR EACH ROW
EXECUTE FUNCTION m8_schema.update_updated_at_column();

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA m8_schema TO authenticated;
GRANT ALL ON m8_schema.user_roles TO authenticated;
GRANT ALL ON m8_schema.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION m8_schema.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION m8_schema.get_user_role(uuid) TO authenticated;
