-- Drop and recreate push_subscriptions SELECT policy with explicit authenticated role
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view their own subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Also ensure INSERT and DELETE are explicitly scoped to authenticated
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can insert their own subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can delete their own subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);