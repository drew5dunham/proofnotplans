
-- Fix 1: goal-proofs DELETE policy - add ownership check
DROP POLICY IF EXISTS "Users can delete their own proofs" ON storage.objects;
CREATE POLICY "Users can delete their own proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'goal-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix 2: Drop the overly permissive notifications INSERT policy if it exists
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;
