-- Add archived field to conversation_participants
ALTER TABLE public.conversation_participants
ADD COLUMN archived BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_conversation_participants_archived 
ON public.conversation_participants(user_id, archived);

-- Update RLS policy to include archived filtering capability
-- (policies remain the same, just adding index for performance)