// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Hook para gerenciar chamadas em grupo WebRTC

import { useState, useRef, useCallback } from 'react';
import { GroupWebRTCCall, Participant, GroupCallState, CallType } from '@/utils/GroupWebRTCCall';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GroupCallHookState {
  isInCall: boolean;
  sessionId: string | null;
  conversationId: string | null;
  callType: CallType | null;
  isHost: boolean;
  roomState: GroupCallState;
  participants: Map<string, Participant>;
  localStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export const useGroupVideoCall = () => {
  const { toast } = useToast();
  const groupCallRef = useRef<GroupWebRTCCall | null>(null);

  const [callState, setCallState] = useState<GroupCallHookState>({
    isInCall: false,
    sessionId: null,
    conversationId: null,
    callType: null,
    isHost: false,
    roomState: 'DIALING',
    participants: new Map(),
    localStream: null,
    isVideoEnabled: true,
    isAudioEnabled: true,
  });

  // Iniciar chamada em grupo (host)
  const startGroupCall = useCallback(async (
    conversationId: string,
    callType: CallType,
    participantIds: string[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      console.log('[useGroupVideoCall] Iniciando chamada em grupo:', { conversationId, callType, participantCount: participantIds.length });
      
      // Não passar sessionId, será gerado pelo banco
      const call = new GroupWebRTCCall(conversationId, user.id, callType, true);
      
      // Configurar callbacks
      call.onStateChange = (state) => {
        console.log('[useGroupVideoCall] Estado da sala mudou:', state);
        setCallState(prev => ({ ...prev, roomState: state }));
      };
      
      call.onLocalStream = (stream) => {
        console.log('[useGroupVideoCall] Stream local recebido');
        setCallState(prev => ({ ...prev, localStream: stream }));
      };
      
      call.onRemoteStream = (userId, stream) => {
        console.log('[useGroupVideoCall] Stream remoto recebido de:', userId);
        setCallState(prev => {
          const newParticipants = new Map(prev.participants);
          const participant = newParticipants.get(userId);
          if (participant) {
            participant.stream = stream;
          }
          return { ...prev, participants: newParticipants };
        });
      };
      
      call.onParticipantJoined = (participant) => {
        console.log('[useGroupVideoCall] Participante entrou:', participant.userId);
        setCallState(prev => {
          const newParticipants = new Map(prev.participants);
          newParticipants.set(participant.userId, participant);
          return { ...prev, participants: newParticipants };
        });
        
        toast({
          title: 'Participante entrou',
          description: `${participant.username} entrou na chamada`,
        });
      };
      
      call.onParticipantLeft = (userId) => {
        console.log('[useGroupVideoCall] Participante saiu:', userId);
        setCallState(prev => {
          const newParticipants = new Map(prev.participants);
          const participant = newParticipants.get(userId);
          newParticipants.delete(userId);
          
          if (participant) {
            toast({
              title: 'Participante saiu',
              description: `${participant.username} saiu da chamada`,
            });
          }
          
          return { ...prev, participants: newParticipants };
        });
      };
      
      call.onError = (error) => {
        console.error('[useGroupVideoCall] Erro na chamada:', error);
        toast({
          title: 'Erro na chamada',
          description: error.message,
          variant: 'destructive',
        });
      };
      
      // Iniciar chamada
      await call.start(participantIds);
      
      groupCallRef.current = call;
      
      // Pegar sessionId (UUID) após criação
      const generatedSessionId = call.getSessionId();
      console.log('[useGroupVideoCall] SessionId gerado:', generatedSessionId);
      
      setCallState({
        isInCall: true,
        sessionId: generatedSessionId,
        conversationId,
        callType,
        isHost: true,
        roomState: 'DIALING',
        participants: new Map(),
        localStream: call.getLocalStream(),
        isVideoEnabled: callType === 'video',
        isAudioEnabled: true,
      });
      
      toast({
        title: 'Chamada iniciada',
        description: `Chamando ${participantIds.length} participantes...`,
      });
    } catch (error) {
      console.error('[useGroupVideoCall] Erro ao iniciar chamada:', error);
      toast({
        title: 'Erro ao iniciar chamada',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Entrar em chamada existente (participante)
  const joinGroupCall = useCallback(async (
    sessionId: string,
    conversationId: string,
    callType: CallType
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      console.log('[useGroupVideoCall] Entrando em chamada em grupo:', { sessionId, conversationId, callType });
      
      const call = new GroupWebRTCCall(conversationId, user.id, callType, false, sessionId);
      
      // Configurar callbacks (mesmos do startGroupCall)
      call.onStateChange = (state) => {
        setCallState(prev => ({ ...prev, roomState: state }));
      };
      
      call.onLocalStream = (stream) => {
        setCallState(prev => ({ ...prev, localStream: stream }));
      };
      
      call.onRemoteStream = (userId, stream) => {
        setCallState(prev => {
          const newParticipants = new Map(prev.participants);
          const participant = newParticipants.get(userId);
          if (participant) {
            participant.stream = stream;
          }
          return { ...prev, participants: newParticipants };
        });
      };
      
      call.onParticipantJoined = (participant) => {
        setCallState(prev => {
          const newParticipants = new Map(prev.participants);
          newParticipants.set(participant.userId, participant);
          return { ...prev, participants: newParticipants };
        });
        
        toast({
          title: 'Participante entrou',
          description: `${participant.username} entrou na chamada`,
        });
      };
      
      call.onParticipantLeft = (userId) => {
        setCallState(prev => {
          const newParticipants = new Map(prev.participants);
          const participant = newParticipants.get(userId);
          newParticipants.delete(userId);
          
          if (participant) {
            toast({
              title: 'Participante saiu',
              description: `${participant.username} saiu da chamada`,
            });
          }
          
          return { ...prev, participants: newParticipants };
        });
      };
      
      call.onError = (error) => {
        console.error('[useGroupVideoCall] Erro na chamada:', error);
        toast({
          title: 'Erro na chamada',
          description: error.message,
          variant: 'destructive',
        });
      };
      
      // Entrar na chamada
      await call.start();
      
      groupCallRef.current = call;
      
      setCallState({
        isInCall: true,
        sessionId,
        conversationId,
        callType,
        isHost: false,
        roomState: 'ACTIVE',
        participants: call.getPeers(),
        localStream: call.getLocalStream(),
        isVideoEnabled: callType === 'video',
        isAudioEnabled: true,
      });
      
      toast({
        title: 'Você entrou na chamada',
        description: 'Conectando com os participantes...',
      });
    } catch (error) {
      console.error('[useGroupVideoCall] Erro ao entrar na chamada:', error);
      toast({
        title: 'Erro ao entrar na chamada',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Encerrar chamada
  const endCall = useCallback(async () => {
    try {
      console.log('[useGroupVideoCall] Encerrando chamada');
      
      if (groupCallRef.current) {
        await groupCallRef.current.end();
        groupCallRef.current = null;
      }
      
      setCallState({
        isInCall: false,
        sessionId: null,
        conversationId: null,
        callType: null,
        isHost: false,
        roomState: 'ENDED',
        participants: new Map(),
        localStream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      
      toast({
        title: 'Chamada encerrada',
      });
    } catch (error) {
      console.error('[useGroupVideoCall] Erro ao encerrar chamada:', error);
    }
  }, [toast]);

  // Toggle vídeo
  const toggleVideo = useCallback(() => {
    if (groupCallRef.current) {
      const newState = !callState.isVideoEnabled;
      groupCallRef.current.toggleVideo(newState);
      setCallState(prev => ({ ...prev, isVideoEnabled: newState }));
    }
  }, [callState.isVideoEnabled]);

  // Toggle áudio
  const toggleAudio = useCallback(() => {
    if (groupCallRef.current) {
      const newState = !callState.isAudioEnabled;
      groupCallRef.current.toggleAudio(newState);
      setCallState(prev => ({ ...prev, isAudioEnabled: newState }));
    }
  }, [callState.isAudioEnabled]);

  // Alternar câmera
  const switchCamera = useCallback(async () => {
    if (groupCallRef.current) {
      await groupCallRef.current.switchCamera();
    }
  }, []);

  return {
    callState,
    startGroupCall,
    joinGroupCall,
    endCall,
    toggleVideo,
    toggleAudio,
    switchCamera,
  };
};
