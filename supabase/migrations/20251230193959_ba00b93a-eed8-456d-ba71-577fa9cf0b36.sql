-- Add status field to track if goal was completed or missed
ALTER TABLE public.goal_completions
ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';