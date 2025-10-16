// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Hook para gerenciar chamadas WebRTC nativas

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCCall, CallStatus, CallType } from '@/utils/WebRTCCall';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NativeCallState {
  isInCall: boolean;
  callId: string | null;
  conversationId: string | null;
  callType: CallType | null;
  status: CallStatus;
  isInitiator: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  connectionQuality: 'good' | 'medium' | 'poor';
  duration: number;
  remoteUserInfo: {
    name: string;
    avatar?: string;
  } | null;
}

export const useNativeVideoCall = () => {
  const { toast } = useToast();
  const webrtcCall = useRef<WebRTCCall | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const [callState, setCallState] = useState<NativeCallState>({
    isInCall: false,
    callId: null,
    conversationId: null,
    callType: null,
    status: 'idle',
    isInitiator: false,
    localStream: null,
    remoteStream: null,
    isVideoEnabled: true,
    isAudioEnabled: true,
    connectionQuality: 'good',
    duration: 0,
    remoteUserInfo: null,
  });

  // Iniciar chamada
  const startCall = useCallback(async (
    conversationId: string,
    callType: CallType = 'video',
    remoteUserInfo: { name: string; avatar?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log(`[useNativeVideoCall] Iniciando chamada ${callType} para conversa ${conversationId}`);

      const call = new WebRTCCall(conversationId, user.id, callType, true);

      // Configurar callbacks
      call.onStatusChange = (status) => {
        console.log('[useNativeVideoCall] Status mudou para:', status);
        setCallState(prev => ({ ...prev, status }));

        // Mostrar notificações de status
        switch (status) {
          case 'calling':
            toast({ title: 'Chamando...', description: `Chamando ${remoteUserInfo.name}` });
            break;
          case 'connecting':
            toast({ title: 'Conectando...', description: 'Estabelecendo conexão' });
            break;
          case 'connected':
            toast({ title: 'Conectado', description: 'Chamada conectada com sucesso' });
            startDurationCounter();
            break;
          case 'reconnecting':
            toast({ title: 'Reconectando...', description: 'Tentando restabelecer a conexão', variant: 'default' });
            break;
          case 'failed':
            toast({ title: 'Falha na chamada', description: 'Não foi possível estabelecer a conexão', variant: 'destructive' });
            break;
          case 'ended':
            toast({ title: 'Chamada encerrada', description: `Duração: ${formatDuration(callState.duration)}` });
            stopDurationCounter();
            break;
        }
      };

      call.onLocalStream = (stream) => {
        console.log('[useNativeVideoCall] Stream local recebido');
        setCallState(prev => ({ ...prev, localStream: stream }));
      };

      call.onRemoteStream = (stream) => {
        console.log('[useNativeVideoCall] Stream remoto recebido');
        setCallState(prev => ({ ...prev, remoteStream: stream }));
      };

      call.onConnectionQuality = (quality) => {
        setCallState(prev => ({ ...prev, connectionQuality: quality }));
        
        if (quality === 'poor') {
          toast({
            title: 'Conexão fraca',
            description: 'A qualidade da chamada pode estar comprometida',
            variant: 'default',
          });
        }
      };

      call.onError = (error) => {
        console.error('[useNativeVideoCall] Erro:', error);
        toast({
          title: 'Erro na chamada',
          description: error.message,
          variant: 'destructive',
        });
      };

      webrtcCall.current = call;

      setCallState(prev => ({
        ...prev,
        isInCall: true,
        callId: call.getCallId(),
        conversationId,
        callType,
        isInitiator: true,
        status: 'calling',
        remoteUserInfo,
      }));

      // Registrar chamada no banco de dados
      await registerCallInDatabase(conversationId, user.id, callType);

      // Iniciar chamada
      await call.start();

      // Enviar mensagem de sistema
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: callType === 'video' ? '📹 Chamada de vídeo iniciada' : '📞 Chamada de áudio iniciada',
        type: 'text',
        metadata: { isSystemMessage: true },
      });

    } catch (error: any) {
      console.error('[useNativeVideoCall] Erro ao iniciar chamada:', error);
      toast({
        title: 'Erro ao iniciar chamada',
        description: error.message,
        variant: 'destructive',
      });
      endCall();
    }
  }, [callState.duration]);

  // Atender chamada recebida
  const answerCall = useCallback(async (
    callId: string,
    conversationId: string,
    callType: CallType,
    remoteUserInfo: { name: string; avatar?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log(`[useNativeVideoCall] Atendendo chamada ${callId}`);

      const call = new WebRTCCall(conversationId, user.id, callType, false, callId);

      // Configurar callbacks (mesmo que startCall)
      call.onStatusChange = (status) => {
        setCallState(prev => ({ ...prev, status }));
        if (status === 'connected') startDurationCounter();
        if (status === 'ended') stopDurationCounter();
      };

      call.onLocalStream = (stream) => {
        setCallState(prev => ({ ...prev, localStream: stream }));
      };

      call.onRemoteStream = (stream) => {
        setCallState(prev => ({ ...prev, remoteStream: stream }));
      };

      call.onConnectionQuality = (quality) => {
        setCallState(prev => ({ ...prev, connectionQuality: quality }));
      };

      call.onError = (error) => {
        console.error('[useNativeVideoCall] Erro:', error);
        toast({ title: 'Erro na chamada', description: error.message, variant: 'destructive' });
      };

      webrtcCall.current = call;

      setCallState(prev => ({
        ...prev,
        isInCall: true,
        callId,
        conversationId,
        callType,
        isInitiator: false,
        status: 'connecting',
        remoteUserInfo,
      }));

      // Iniciar chamada
      await call.start();

      toast({ title: 'Chamada atendida', description: 'Conectando...' });

    } catch (error: any) {
      console.error('[useNativeVideoCall] Erro ao atender chamada:', error);
      toast({ title: 'Erro ao atender chamada', description: error.message, variant: 'destructive' });
      endCall();
    }
  }, []);

  // Encerrar chamada
  const endCall = useCallback(() => {
    console.log('[useNativeVideoCall] Encerrando chamada');
    
    if (webrtcCall.current) {
      webrtcCall.current.end();
      webrtcCall.current = null;
    }

    stopDurationCounter();

    setCallState({
      isInCall: false,
      callId: null,
      conversationId: null,
      callType: null,
      status: 'idle',
      isInitiator: false,
      localStream: null,
      remoteStream: null,
      isVideoEnabled: true,
      isAudioEnabled: true,
      connectionQuality: 'good',
      duration: 0,
      remoteUserInfo: null,
    });
  }, []);

  // Alternar vídeo
  const toggleVideo = useCallback(async () => {
    if (!webrtcCall.current) return;
    
    const enabled = await webrtcCall.current.toggleVideo();
    setCallState(prev => ({ ...prev, isVideoEnabled: enabled }));
  }, []);

  // Alternar áudio
  const toggleAudio = useCallback(async () => {
    if (!webrtcCall.current) return;
    
    const enabled = await webrtcCall.current.toggleAudio();
    setCallState(prev => ({ ...prev, isAudioEnabled: enabled }));
  }, []);

  // Alternar câmera
  const switchCamera = useCallback(async () => {
    if (!webrtcCall.current) return;
    await webrtcCall.current.switchCamera();
  }, []);

  // Contador de duração
  const startDurationCounter = () => {
    stopDurationCounter();
    durationInterval.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  };

  const stopDurationCounter = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Registrar chamada no banco - FASE 2: Corrigir user_id
  const registerCallInDatabase = async (
    conversationId: string,
    callerId: string,
    callType: CallType
  ) => {
    try {
      // Buscar o outro participante da conversa (destinatário)
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', callerId);
      
      if (!participants || participants.length === 0) {
        throw new Error('Destinatário não encontrado');
      }
      
      const recipientId = participants[0].user_id;
      
      console.log('[useNativeVideoCall] Registrando chamada:', {
        callerId,
        recipientId,
        conversationId,
        callType
      });
      
      // Inserir notificação de chamada para o DESTINATÁRIO
      const { data: callNotification, error } = await supabase
        .from('call_notifications')
        .insert({
          conversation_id: conversationId,
          caller_id: callerId,
          user_id: recipientId, // ✅ DESTINATÁRIO, não o caller!
          call_type: callType,
          status: 'ringing',
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      console.log('[useNativeVideoCall] Chamada registrada com sucesso:', callNotification);
      
      return callNotification?.id;
    } catch (error) {
      console.error('[useNativeVideoCall] Erro ao registrar chamada:', error);
      throw error;
    }
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (webrtcCall.current) {
        webrtcCall.current.end();
      }
      stopDurationCounter();
    };
  }, []);

  return {
    callState,
    startCall,
    answerCall,
    endCall,
    toggleVideo,
    toggleAudio,
    switchCamera,
    formatDuration: (seconds: number) => formatDuration(seconds),
  };
};
