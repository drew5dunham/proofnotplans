-- Add frequency column to goals table with default 'daily' for existing goals
ALTER TABLE public.goals 
ADD COLUMN frequency text NOT NULL DEFAULT 'daily';

-- Add a check constraint for valid frequency values
ALTER TABLE public.goals 
ADD CONSTRAINT goals_frequency_check CHECK (frequency IN ('daily', 'weekly', 'monthly'));