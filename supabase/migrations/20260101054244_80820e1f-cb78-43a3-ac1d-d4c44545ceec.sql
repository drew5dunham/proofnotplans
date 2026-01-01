-- Create a single, secure entrypoint for group creation.
-- This avoids multi-step client inserts failing under RLS and guarantees created_by/user_id are set from auth.uid().

CREATE OR REPLACE FUNCTION public.create_group(
  _name text,
  _category text
)
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group public.groups;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.groups (name, category, created_by)
  VALUES (_name, _category, auth.uid())
  RETURNING * INTO new_group;

  INSERT INTO public.group_members (group_id, user_id, invited_by)
  VALUES (new_group.id, auth.uid(), NULL);

  RETURN new_group;
END;
$$;

-- Allow logged-in users to call it
REVOKE ALL ON FUNCTION public.create_group(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group(text, text) TO authenticated;