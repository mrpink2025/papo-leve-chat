-- Tabela para rastrear chamadas e notificações de chamadas
CREATE TABLE IF NOT EXISTS public.call_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  caller_id UUID NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('video', 'audio')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'declined', 'missed', 'ended')),
  ringtone TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own call notifications"
  ON public.call_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call notifications"
  ON public.call_notifications
  FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update own call notifications"
  ON public.call_notifications
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = caller_id);

CREATE POLICY "Users can delete own call notifications"
  ON public.call_notifications
  FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = caller_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_call_notifications_updated_at
  BEFORE UPDATE ON public.call_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_call_notifications_user_id ON public.call_notifications(user_id);
CREATE INDEX idx_call_notifications_conversation_id ON public.call_notifications(conversation_id);
CREATE INDEX idx_call_notifications_caller_id ON public.call_notifications(caller_id);
CREATE INDEX idx_call_notifications_status ON public.call_notifications(status);
CREATE INDEX idx_call_notifications_started_at ON public.call_notifications(started_at DESC);

-- Índice composto para chamadas perdidas
CREATE INDEX idx_call_notifications_missed ON public.call_notifications(user_id, status) 
  WHERE status = 'missed';

-- Tabela para configurações de ringtone do usuário
CREATE TABLE IF NOT EXISTS public.user_ringtones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  default_ringtone TEXT NOT NULL DEFAULT 'default',
  contact_ringtones JSONB DEFAULT '{}',
  vibration_enabled BOOLEAN DEFAULT true,
  flash_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ringtones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own ringtone settings"
  ON public.user_ringtones
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ringtone settings"
  ON public.user_ringtones
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ringtone settings"
  ON public.user_ringtones
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_ringtones_updated_at
  BEFORE UPDATE ON public.user_ringtones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para limpar chamadas antigas (> 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_calls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.call_notifications
  WHERE started_at < now() - interval '30 days';
END;
$$;

COMMENT ON TABLE public.call_notifications IS 'Rastreia todas as chamadas (vídeo e áudio) e seus status';
COMMENT ON TABLE public.user_ringtones IS 'Configurações de ringtones personalizados por usuário';
COMMENT ON FUNCTION public.cleanup_old_calls IS 'Limpa chamadas com mais de 30 dias para manter o banco otimizado';