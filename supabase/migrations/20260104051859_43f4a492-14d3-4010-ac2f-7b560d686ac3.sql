-- Create a security definer function to search users by name for friend discovery
-- This allows users to find others to send friend requests to
CREATE OR REPLACE FUNCTION public.search_users_by_name(_search_term text, _current_user_id uuid)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.profiles p
  WHERE p.name ILIKE '%' || _search_term || '%'
    AND p.id != _current_user_id
    -- Exclude users who already have a friendship (pending or accepted)
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.user_id = _current_user_id AND f.friend_id = p.id)
         OR (f.user_id = p.id AND f.friend_id = _current_user_id)
    )
  LIMIT 20;
$$;