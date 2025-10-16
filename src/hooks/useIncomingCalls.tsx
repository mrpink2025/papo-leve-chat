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
  const [missedTimeout, setMissedTimeout] = useState<NodeJS.Timeout | null>(null);

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

            // FASE 3: Timeout de 30 segundos para marcar como "missed"
            const timeout = setTimeout(async () => {
              console.log('[useIncomingCalls] Chamada não atendida, marcando como missed');
              
              await supabase
                .from('call_notifications')
                .update({ 
                  status: 'missed', 
                  ended_at: new Date().toISOString() 
                })
                .eq('id', callData.id);
              
              stopRingtone();
              setIncomingCall(null);
              
              toast({
                title: 'Chamada perdida',
                description: `Você perdeu uma chamada de ${incomingCallData.callerName}`,
              });
            }, 30000); // 30 segundos
            
            setMissedTimeout(timeout);
          }
        }
      )
      .subscribe((status) => {
        // FASE 6: Logs de debug
        console.log('[useIncomingCalls] Status da subscrição:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useIncomingCalls] Listener de chamadas ATIVO para userId:', userId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [useIncomingCalls] Erro no canal Realtime');
        }
      });

    // Limpar ao desmontar
    return () => {
      supabase.removeChannel(callsChannel);
      stopRingtone();
    };
  }, [userId, toast]);

  // Aceitar chamada
  const acceptCall = useCallback(() => {
    stopRingtone();
    // Limpar timeout
    if (missedTimeout) {
      clearTimeout(missedTimeout);
      setMissedTimeout(null);
    }
    // Não limpar incomingCall aqui, será limpo pelo componente pai
  }, [missedTimeout]);

  // Rejeitar chamada
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log('[useIncomingCalls] Rejeitando chamada:', incomingCall.callId);
    
    stopRingtone();
    
    // Limpar timeout
    if (missedTimeout) {
      clearTimeout(missedTimeout);
      setMissedTimeout(null);
    }

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
  }, [incomingCall, toast, missedTimeout]);

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

// FASE 4: Variáveis globais para controlar o ringtone com Web Audio API
let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let ringInterval: NodeJS.Timeout | null = null;

function playRingtone() {
  try {
    if (audioContext) {
      console.log('[useIncomingCalls] Ringtone já está tocando');
      return;
    }

    console.log('[useIncomingCalls] Iniciando ringtone com Web Audio API');
    
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3; // 30% volume
    gainNode.connect(audioContext.destination);
    
    // Padrão de toque: 1s on, 0.5s off
    let isPlaying = false;
    
    const playTone = () => {
      if (isPlaying) return;
      
      isPlaying = true;
      oscillator = audioContext!.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // Nota Lá (A4)
      oscillator.connect(gainNode!);
      oscillator.start(0);
      
      setTimeout(() => {
        if (oscillator) {
          oscillator.stop();
          oscillator.disconnect();
          oscillator = null;
        }
        isPlaying = false;
      }, 1000); // Toca por 1 segundo
    };
    
    // Iniciar primeiro toque
    playTone();
    
    // Continuar tocando em intervalos (1s on, 0.5s off = 1.5s total)
    ringInterval = setInterval(() => {
      if (audioContext) {
        playTone();
      }
    }, 1500);
    
  } catch (error) {
    console.warn('[useIncomingCalls] Erro ao tocar ringtone:', error);
  }
}

function stopRingtone() {
  console.log('[useIncomingCalls] Parando ringtone');
  
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  
  if (oscillator) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch (e) {
      // Ignorar erro se já foi parado
    }
    oscillator = null;
  }
  
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}
