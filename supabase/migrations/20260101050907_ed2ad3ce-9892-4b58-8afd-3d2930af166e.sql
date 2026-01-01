-- Add visibility column to goals table
ALTER TABLE public.goals 
ADD COLUMN visibility text NOT NULL DEFAULT 'public';

-- Update RLS policy for viewing goals - private goals only visible to owner
DROP POLICY IF EXISTS "Anyone can view goals for public profiles" ON public.goals;

CREATE POLICY "Users can view public goals or their own private goals" 
ON public.goals 
FOR SELECT 
USING (
  visibility = 'public' OR auth.uid() = user_id
);

-- Update goal_completions RLS - private goal completions only visible to owner
DROP POLICY IF EXISTS "Anyone can view completions for feed" ON public.goal_completions;

CREATE POLICY "Users can view public completions or their own" 
ON public.goal_completions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.goals 
    WHERE goals.id = goal_completions.goal_id 
    AND (goals.visibility = 'public' OR goals.user_id = auth.uid())
  )
  OR auth.uid() = user_id
);