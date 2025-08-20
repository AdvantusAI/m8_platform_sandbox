-- Assign admin role to the current admin user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('7b97c210-cb2a-4ffa-a107-a310b14a4776', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;