-- Create storage bucket for sunsky exports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sunsky-exports', 'sunsky-exports', false);

-- Create RLS policies for the sunsky-exports bucket
CREATE POLICY "Users can view their own export files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sunsky-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own export files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sunsky-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own export files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'sunsky-exports' AND auth.uid()::text = (storage.foldername(name))[1]);