-- Adicionar novos tipos de mensagem à constraint
-- Primeiro, remover a constraint antiga
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;

-- Criar nova constraint com os tipos adicionais
ALTER TABLE public.messages 
ADD CONSTRAINT messages_type_check 
CHECK (type IN ('text', 'image', 'audio', 'video', 'document', 'story_reply', 'story_reaction'));