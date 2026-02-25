CREATE OR REPLACE FUNCTION public.search_users_by_name(_search_term text, _current_user_id uuid)
 RETURNS TABLE(id uuid, name text, friendship_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id, 
    p.name,
    COALESCE(
      (SELECT 
        CASE 
          WHEN f.status = 'accepted' THEN 'accepted'
          WHEN f.status = 'pending' AND f.user_id = _current_user_id THEN 'pending_sent'
          WHEN f.status = 'pending' AND f.friend_id = _current_user_id THEN 'pending_received'
          ELSE f.status
        END
       FROM public.friendships f
       WHERE (f.user_id = _current_user_id AND f.friend_id = p.id)
          OR (f.user_id = p.id AND f.friend_id = _current_user_id)
       ORDER BY f.created_at DESC
       LIMIT 1),
      'none'
    ) AS friendship_status
  FROM public.profiles p
  WHERE p.name ILIKE '%' || _search_term || '%'
    AND p.id != _current_user_id
  LIMIT 20;
$function$;