-- Allow anyone to view goals for public profiles
CREATE POLICY "Anyone can view goals for public profiles"
ON public.goals
FOR SELECT
USING (true);