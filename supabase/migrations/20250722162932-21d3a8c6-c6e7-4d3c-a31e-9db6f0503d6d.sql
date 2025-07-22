-- Fix infinite recursion in profiles RLS policies by using security definer functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles except main admin role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete non-main admin profiles" ON public.profiles;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create new policies using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_user_admin(auth.uid()) OR auth.uid() = id);

CREATE POLICY "Admins can create user profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update profiles except main admin role" 
ON public.profiles 
FOR UPDATE 
USING (
  public.is_user_admin(auth.uid()) 
  AND (is_main_admin = FALSE OR auth.uid() = id)
);

CREATE POLICY "Admins can delete non-main admin profiles" 
ON public.profiles 
FOR DELETE 
USING (
  public.is_user_admin(auth.uid()) 
  AND is_main_admin = FALSE
);