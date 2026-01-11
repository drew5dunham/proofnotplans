-- Drop the policy that allows unauthenticated reads for profiles with public goals
DROP POLICY IF EXISTS "Users can view profiles of users with public goals" ON public.profiles;

-- Recreate the policy to require authentication
CREATE POLICY "Authenticated users can view profiles of users with public goals" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.user_id = profiles.id 
    AND goals.visibility = 'public'
  )
);