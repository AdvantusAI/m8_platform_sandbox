-- Enable Row Level Security on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view all user profiles (needed for user management)
CREATE POLICY "Authenticated users can view all user profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to insert user profiles (for user creation)
CREATE POLICY "Authenticated users can create user profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to update user profiles (for user editing)
CREATE POLICY "Authenticated users can update user profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to delete user profiles (for user deletion)
CREATE POLICY "Authenticated users can delete user profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (true);