-- Add platform column to push_subscriptions to distinguish between web and iOS
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web';

-- Add device_token column for APNs (iOS)
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Drop the existing constraint (not just the index)
ALTER TABLE public.push_subscriptions 
DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_endpoint_key;

-- Create new unique constraint that accounts for platform
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_platform_key 
ON public.push_subscriptions(user_id, endpoint, platform);

-- Add index for querying by platform
CREATE INDEX IF NOT EXISTS push_subscriptions_platform_idx 
ON public.push_subscriptions(platform);