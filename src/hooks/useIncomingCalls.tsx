// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Hook para gerenciar chamadas recebidas via Supabase Realtime

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallType } from '@/utils/WebRTCCall';
import { useToast } from '@/hooks/use-toast';

export interface IncomingCall {
  callId: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: CallType;
}

export const useIncomingCalls = (userId: string | undefined) => {
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log('[useIncomingCalls] Configurando listener de chamadas para usuário:', userId);

    // Escutar por novas chamadas via Supabase Realtime
    const callsChannel = supabase
      .channel('call_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('[useIncomingCalls] Nova chamada recebida:', payload);
          
          const callData = payload.new as any;

          // Buscar informações do chamador
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', callData.caller_id)
            .single();

          if (callData.status === 'ringing' && callData.caller_id !== userId) {
            const incomingCallData: IncomingCall = {
              callId: callData.id,
              conversationId: callData.conversation_id,
              callerId: callData.caller_id,
              callerName: callerProfile?.full_name || callerProfile?.username || 'Desconhecido',
              callerAvatar: callerProfile?.avatar_url,
              callType: callData.call_type as CallType,
            };

            setIncomingCall(incomingCallData);

            // Tocar som de chamada (ringtone)
            playRingtone();

            // Notificação
            toast({
              title: `📞 Chamada de ${incomingCallData.callerName}`,
              description: `Chamada de ${callData.call_type === 'video' ? 'vídeo' : 'áudio'} recebida`,
            });
          }
        }
      )
      .subscribe();

    // Limpar ao desmontar
    return () => {
      supabase.removeChannel(callsChannel);
      stopRingtone();
    };
  }, [userId, toast]);

  // Aceitar chamada
  const acceptCall = useCallback(() => {
    stopRingtone();
    // Não limpar incomingCall aqui, será limpo pelo componente pai
  }, []);

  // Rejeitar chamada
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log('[useIncomingCalls] Rejeitando chamada:', incomingCall.callId);
    
    stopRingtone();

    // Atualizar status no banco
    await supabase
      .from('call_notifications')
      .update({ status: 'rejected', ended_at: new Date().toISOString() })
      .eq('id', incomingCall.callId);

    setIncomingCall(null);

    toast({
      title: 'Chamada recusada',
      description: 'Você recusou a chamada',
    });
  }, [incomingCall, toast]);

  // Limpar chamada (após atender)
  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    acceptCall,
    rejectCall,
    clearIncomingCall,
  };
};

// Variável global para controlar o ringtone
let ringtoneAudio: HTMLAudioElement | null = null;

function playRingtone() {
  try {
    // Criar áudio de ringtone (usando tom padrão do navegador)
    if (!ringtoneAudio) {
      ringtoneAudio = new Audio();
      // Usar data URL com um tom simples
      ringtoneAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZSA0PWqPn77BdGQg+ltryxnMnBSl+zPLaizsIGGS57OihUBELTKXh8bllHgU2jdXzzn0vBSF1xe/glEILEl+36+6oVxQKRp/g8r5sIQYxh9Hz04IzBh5uwO/jmUgND1qj5++wXRkIPpba8sZzJwUpfszy2os7CBhkuezooVARCU';
      ringtoneAudio.loop = true;
      ringtoneAudio.volume = 0.5;
    }
    
    ringtoneAudio.play().catch((error) => {
      console.warn('[useIncomingCalls] Não foi possível tocar ringtone:', error);
    });
  } catch (error) {
    console.warn('[useIncomingCalls] Erro ao tocar ringtone:', error);
  }
}

function stopRingtone() {
  if (ringtoneAudio) {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
  }
}
