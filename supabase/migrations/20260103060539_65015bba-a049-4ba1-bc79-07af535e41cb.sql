-- Add status column to group_members for invitation flow
ALTER TABLE public.group_members 
ADD COLUMN status text NOT NULL DEFAULT 'accepted';

-- Update existing members to be 'accepted'
UPDATE public.group_members SET status = 'accepted' WHERE status IS NULL OR status = '';

-- Add index for faster queries on status
CREATE INDEX idx_group_members_status ON public.group_members(status);

-- Update RLS policy to allow users to update their own membership status (accept/decline)
CREATE POLICY "Users can update their own membership status"
ON public.group_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to see pending invitations sent to them
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members or own pending invites"
ON public.group_members
FOR SELECT
USING (
  is_group_member(group_id, auth.uid()) 
  OR (auth.uid() = user_id AND status = 'pending')
);

-- Update insert policy to allow inviting (creates pending membership)
DROP POLICY IF EXISTS "Members can invite to group" ON public.group_members;
CREATE POLICY "Members can invite to group"
ON public.group_members
FOR INSERT
WITH CHECK (
  (is_group_member(group_id, auth.uid()) AND status = 'pending')
  OR (auth.uid() = user_id AND status = 'accepted')
);