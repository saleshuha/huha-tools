-- Add DELETE policy for noon_file_headers table
CREATE POLICY "Users can delete their own file headers" 
ON public.noon_file_headers 
FOR DELETE 
USING (auth.uid() = user_id);