-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  country TEXT NOT NULL CHECK (country IN ('UAE', 'KSA')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_main_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can create user profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Admins can update profiles except main admin role" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  AND (is_main_admin = FALSE OR auth.uid() = id)
);

CREATE POLICY "Admins can delete non-main admin profiles" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  AND is_main_admin = FALSE
);

-- Add country column to existing inventory tables
ALTER TABLE public.asin_inventory 
ADD COLUMN country TEXT NOT NULL DEFAULT 'UAE' CHECK (country IN ('UAE', 'KSA'));

ALTER TABLE public.sku_inventory 
ADD COLUMN country TEXT NOT NULL DEFAULT 'UAE' CHECK (country IN ('UAE', 'KSA'));

ALTER TABLE public.payments 
ADD COLUMN country TEXT CHECK (country IN ('UAE', 'KSA'));

-- Update existing policies to include country filtering
DROP POLICY "Users can view their own ASIN inventory" ON public.asin_inventory;
DROP POLICY "Users can view their own SKU inventory" ON public.sku_inventory;
DROP POLICY "Users can view their own payments" ON public.payments;

CREATE POLICY "Users can view their country ASIN inventory" 
ON public.asin_inventory 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND country = (
    SELECT p.country FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can view their country SKU inventory" 
ON public.sku_inventory 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND country = (
    SELECT p.country FROM public.profiles p WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can view their country payments" 
ON public.payments 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND (country IS NULL OR country = (
    SELECT p.country FROM public.profiles p WHERE p.id = auth.uid()
  ))
);

-- Create trigger for automatic profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, country, role, is_main_admin)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'country', 'UAE'),
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 
      THEN 'admin' 
      ELSE 'user' 
    END,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') = 0 
      THEN TRUE 
      ELSE FALSE 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();