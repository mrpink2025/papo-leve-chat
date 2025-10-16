-- Remove the overly restrictive RLS policy
DROP POLICY IF EXISTS "Users can view stories from contacts" ON public.stories;

-- Create a new policy that allows authenticated users to view all stories
-- This is similar to how Instagram/WhatsApp stories work
CREATE POLICY "Authenticated users can view all stories"
ON public.stories
FOR SELECT
TO authenticated
USING (
  expires_at >= now()
);