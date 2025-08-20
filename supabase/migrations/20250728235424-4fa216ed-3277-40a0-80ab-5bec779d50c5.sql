-- Add assigned_by column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN assigned_by uuid REFERENCES auth.users(id);