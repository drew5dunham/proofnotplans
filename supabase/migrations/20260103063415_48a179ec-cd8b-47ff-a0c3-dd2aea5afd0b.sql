-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;

-- Create a new policy that only allows authenticated users to view comments
CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);