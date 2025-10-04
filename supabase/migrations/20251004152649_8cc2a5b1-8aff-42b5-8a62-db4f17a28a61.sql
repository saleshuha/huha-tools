-- Update the handle_new_user trigger to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Determine the role for the new user
  user_role := CASE 
    WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 
    THEN 'admin'::public.app_role
    ELSE COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user'::public.app_role)
  END;

  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, country, role, is_main_admin)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'country', 'UAE'),
    user_role,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 
      THEN TRUE 
      ELSE FALSE 
    END
  );

  -- Also insert into user_roles table for RBAC
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;