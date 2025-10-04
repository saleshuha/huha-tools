-- Sync any existing users who don't have entries in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id
)
AND p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;