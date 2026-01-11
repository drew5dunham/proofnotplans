-- Allow users to delete messages they sent or received
CREATE POLICY "Users can delete their messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);