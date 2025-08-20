-- Add policy to allow authenticated users to view all user roles (needed for user management interface)
CREATE POLICY "Authenticated users can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);