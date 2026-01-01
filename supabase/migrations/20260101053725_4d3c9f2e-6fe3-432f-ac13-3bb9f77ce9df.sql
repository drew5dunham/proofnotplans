-- Fix RLS recursion on group_members by using a SECURITY DEFINER helper

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = _user_id
  );
$$;

-- Drop existing policies (created in previous migration)
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Creator can delete group" ON public.groups;

DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Members can invite to group" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

-- Recreate policies without self-referential recursion
CREATE POLICY "Members can view their groups"
ON public.groups FOR SELECT
USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can delete group"
ON public.groups FOR DELETE
USING (auth.uid() = created_by);

CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can invite to group"
ON public.group_members FOR INSERT
WITH CHECK (
  public.is_group_member(group_id, auth.uid())
  OR auth.uid() = user_id
);

CREATE POLICY "Users can leave groups"
ON public.group_members FOR DELETE
USING (auth.uid() = user_id);
