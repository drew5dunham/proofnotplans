-- Add reflection fields to goal_completions
ALTER TABLE public.goal_completions
ADD COLUMN what_went_well TEXT,
ADD COLUMN what_was_hard TEXT;