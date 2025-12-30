-- Allow anyone to view profile names for feed display
CREATE POLICY "Anyone can view profile names for feed"
ON public.profiles
FOR SELECT
USING (true);