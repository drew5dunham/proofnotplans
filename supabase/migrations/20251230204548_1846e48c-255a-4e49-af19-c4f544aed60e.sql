-- Create encouragements table to store encouragement messages
CREATE TABLE public.encouragements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  emoji text,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.encouragements ENABLE ROW LEVEL SECURITY;

-- Users can send encouragements (insert)
CREATE POLICY "Users can send encouragements"
ON public.encouragements
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can view encouragements they received
CREATE POLICY "Users can view received encouragements"
ON public.encouragements
FOR SELECT
USING (auth.uid() = recipient_id);

-- Users can view encouragements they sent
CREATE POLICY "Users can view sent encouragements"
ON public.encouragements
FOR SELECT
USING (auth.uid() = sender_id);

-- Users can update their received encouragements (mark as read)
CREATE POLICY "Users can mark their encouragements as read"
ON public.encouragements
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Create friendships table for friend connections
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can create friend requests
CREATE POLICY "Users can create friend requests"
ON public.friendships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own friendships (sent or received)
CREATE POLICY "Users can view their friendships"
ON public.friendships
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can update friendships they received (accept/reject)
CREATE POLICY "Users can update received friend requests"
ON public.friendships
FOR UPDATE
USING (auth.uid() = friend_id);

-- Users can delete their own friend requests
CREATE POLICY "Users can delete their friend requests"
ON public.friendships
FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);