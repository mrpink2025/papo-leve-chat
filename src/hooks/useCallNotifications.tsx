import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRingtone } from './useRingtone';
import { sendCallNotification, cancelCallNotifications } from '@/utils/pushNotificationHelper';

export interface CallNotification {
  id: string;
  user_id: string;
  conversation_id: string;
  caller_id: string;
  call_type: 'video' | 'audio';
  status: 'ringing' | 'answered' | 'declined' | 'missed' | 'ended';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  caller?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

/**
 * Hook para gerenciar notificações de chamadas
 * - Chamadas recebidas em tempo real
 * - Ringtone automático
 * - Ações: Atender/Recusar
 * - Rastreamento de chamadas perdidas
 */
export const useCallNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playRingtone, stopRingtone } = useRingtone();
  const [incomingCall, setIncomingCall] = useState<CallNotification | null>(null);

  // Buscar chamadas pendentes (ringing)
  const { data: pendingCalls } = useQuery({
    queryKey: ['pending-calls', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: calls, error } = await supabase
        .from('call_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ringing')
        .order('started_at', { ascending: false });

      if (error) throw error;
      if (!calls || calls.length === 0) return [];

      // Buscar perfis dos callers separadamente
      const callerIds = calls.map(call => call.caller_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', callerIds);

      // Combinar calls com profiles
      const callsWithCallers = calls.map(call => ({
        ...call,
        caller: profiles?.find(p => p.id === call.caller_id) || null,
      })) as CallNotification[];

      return callsWithCallers;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refetch a cada 5s
  });

  // Buscar chamadas perdidas
  const { data: missedCalls } = useQuery({
    queryKey: ['missed-calls', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: calls, error } = await supabase
        .from('call_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'missed')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!calls || calls.length === 0) return [];

      // Buscar perfis dos callers separadamente
      const callerIds = calls.map(call => call.caller_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', callerIds);

      // Combinar calls com profiles
      const callsWithCallers = calls.map(call => ({
        ...call,
        caller: profiles?.find(p => p.id === call.caller_id) || null,
      })) as CallNotification[];

      return callsWithCallers;
    },
    enabled: !!user?.id,
  });

  // Iniciar chamada
  const startCall = useMutation({
    mutationFn: async ({
      conversationId,
      userId,
      callType,
    }: {
      conversationId: string;
      userId: string;
      callType: 'video' | 'audio';
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('call_notifications')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          caller_id: user.id,
          call_type: callType,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação push
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      await sendCallNotification(
        userId,
        data.id,
        conversationId,
        callType,
        profile?.full_name || profile?.username || 'Alguém',
        profile?.avatar_url
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-calls'] });
    },
  });

  // Atender chamada
  const answerCall = useMutation({
    mutationFn: async (callId: string) => {
      const { data, error } = await supabase
        .from('call_notifications')
        .update({
          status: 'answered',
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;

      // Cancelar notificações em outros dispositivos
      if (user?.id) {
        await cancelCallNotifications(user.id, callId);
      }

      return data;
    },
    onSuccess: () => {
      stopRingtone();
      setIncomingCall(null);
      queryClient.invalidateQueries({ queryKey: ['pending-calls'] });
    },
  });

  // Recusar chamada
  const declineCall = useMutation({
    mutationFn: async (callId: string) => {
      const { data, error } = await supabase
        .from('call_notifications')
        .update({
          status: 'declined',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      stopRingtone();
      setIncomingCall(null);
      queryClient.invalidateQueries({ queryKey: ['pending-calls'] });
    },
  });

  // Marcar como perdida (timeout)
  const markAsMissed = useMutation({
    mutationFn: async (callId: string) => {
      const { data, error } = await supabase
        .from('call_notifications')
        .update({
          status: 'missed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      stopRingtone();
      setIncomingCall(null);
      queryClient.invalidateQueries({ queryKey: ['pending-calls'] });
      queryClient.invalidateQueries({ queryKey: ['missed-calls'] });
    },
  });

  // Encerrar chamada
  const endCall = useMutation({
    mutationFn: async ({
      callId,
      durationSeconds,
    }: {
      callId: string;
      durationSeconds: number;
    }) => {
      const { data, error } = await supabase
        .from('call_notifications')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-calls'] });
    },
  });

  // Retornar chamada perdida
  const callBack = useCallback(
    async (missedCall: CallNotification) => {
      return startCall.mutateAsync({
        conversationId: missedCall.conversation_id,
        userId: missedCall.caller_id, // Ligar de volta para quem ligou
        callType: missedCall.call_type,
      });
    },
    [startCall]
  );

  // Escutar chamadas recebidas em tempo real
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newCall = payload.new as CallNotification;

          if (newCall.status === 'ringing') {
            // Buscar dados do chamador
            const { data: caller } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', newCall.caller_id)
              .single();

            const callWithCaller = {
              ...newCall,
              caller,
            };

            setIncomingCall(callWithCaller);
            
            // Tocar ringtone
            playRingtone(newCall.caller_id);

            // Auto-marcar como perdida após 30 segundos
            setTimeout(() => {
              if (incomingCall?.id === newCall.id) {
                markAsMissed.mutate(newCall.id);
              }
            }, 30000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedCall = payload.new as CallNotification;

          // Se a chamada foi atendida/recusada por outro dispositivo
          if (
            incomingCall?.id === updatedCall.id &&
            ['answered', 'declined', 'missed'].includes(updatedCall.status)
          ) {
            stopRingtone();
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, playRingtone, stopRingtone, incomingCall, markAsMissed]);

  return {
    incomingCall,
    pendingCalls: pendingCalls || [],
    missedCalls: missedCalls || [],
    startCall: startCall.mutateAsync,
    answerCall: answerCall.mutateAsync,
    declineCall: declineCall.mutateAsync,
    endCall: endCall.mutateAsync,
    callBack,
    isStarting: startCall.isPending,
    isAnswering: answerCall.isPending,
    isDeclining: declineCall.isPending,
  };
};
