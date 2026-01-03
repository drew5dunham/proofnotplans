-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;

-- Create a new policy that requires the actor to be the authenticated user
CREATE POLICY "Users can create notifications as themselves"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());