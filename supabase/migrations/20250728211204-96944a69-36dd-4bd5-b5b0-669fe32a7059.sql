-- Update the admin role to administrator to match the hook
UPDATE public.user_roles 
SET role = 'administrator'
WHERE user_id = '7b97c210-cb2a-4ffa-a107-a310b14a4776' 
AND role = 'admin';