-- Create user page permissions table
CREATE TABLE IF NOT EXISTS public.user_page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_route TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, page_route)
);

-- Enable RLS
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all page permissions
CREATE POLICY "Admins can manage page permissions"
ON public.user_page_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own page permissions
CREATE POLICY "Users can view own page permissions"
ON public.user_page_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_page_permissions_user_id ON public.user_page_permissions(user_id);
CREATE INDEX idx_user_page_permissions_route ON public.user_page_permissions(page_route);