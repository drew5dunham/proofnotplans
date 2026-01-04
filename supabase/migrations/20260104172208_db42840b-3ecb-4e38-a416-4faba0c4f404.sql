-- Allow viewing profiles of users who have public goals (for profile pages)
CREATE POLICY "Users can view profiles of users with public goals"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.goals
    WHERE goals.user_id = profiles.id
    AND goals.visibility = 'public'
  )
);