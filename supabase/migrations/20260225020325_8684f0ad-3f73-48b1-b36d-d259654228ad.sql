
-- Drop the existing restrictive INSERT policy on notifications
DROP POLICY IF EXISTS "Users can create notifications as themselves" ON public.notifications;

-- Recreate as a PERMISSIVE policy (default behavior, but being explicit)
CREATE POLICY "Users can create notifications as themselves"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());
