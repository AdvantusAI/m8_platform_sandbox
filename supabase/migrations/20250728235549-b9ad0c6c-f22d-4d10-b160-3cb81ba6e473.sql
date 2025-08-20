-- Add policy to allow authenticated users to insert user roles
CREATE POLICY "Authenticated users can create user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy to allow authenticated users to update user roles  
CREATE POLICY "Authenticated users can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add policy to allow authenticated users to delete user roles
CREATE POLICY "Authenticated users can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (true);