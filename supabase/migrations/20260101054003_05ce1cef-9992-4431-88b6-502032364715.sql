-- Fix: The INSERT policy needs to check auth.uid() matches the created_by being inserted
-- Drop and recreate with proper syntax

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Also ensure group_members INSERT works for the creator joining their own group
DROP POLICY IF EXISTS "Members can invite to group" ON public.group_members;

CREATE POLICY "Members can invite to group"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
  public.is_group_member(group_id, auth.uid())
  OR auth.uid() = user_id
);