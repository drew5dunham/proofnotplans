-- Create a SECURITY DEFINER function to create notifications
-- This bypasses RLS so the sender can create a notification for the recipient
CREATE OR REPLACE FUNCTION public.create_friend_request_notification(
  _recipient_id uuid,
  _actor_id uuid,
  _title text,
  _body text,
  _reference_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _notification_id uuid;
BEGIN
  -- Verify the caller is the actor
  IF auth.uid() IS NULL OR auth.uid() != _actor_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, reference_id)
  VALUES (_recipient_id, _actor_id, 'friend_request', _title, _body, _reference_id)
  RETURNING id INTO _notification_id;

  RETURN _notification_id;
END;
$function$;