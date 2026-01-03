-- Create a security definer function to check if users are connected
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Can always view own profile
    _viewer_id = _profile_id
    OR
    -- Can view accepted friends
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
        AND (
          (user_id = _viewer_id AND friend_id = _profile_id)
          OR (user_id = _profile_id AND friend_id = _viewer_id)
        )
    )
    OR
    -- Can view members of same groups
    EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = _viewer_id 
        AND gm2.user_id = _profile_id
        AND gm1.status = 'accepted'
        AND gm2.status = 'accepted'
    )
$$;

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a restricted policy using the function
CREATE POLICY "Users can view connected profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), id));