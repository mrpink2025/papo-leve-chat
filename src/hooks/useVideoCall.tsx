import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VideoCallState {
  isInCall: boolean;
  roomName: string | null;
  conversationId: string | null;
}

export const useVideoCall = () => {
  const [callState, setCallState] = useState<VideoCallState>({
    isInCall: false,
    roomName: null,
    conversationId: null,
  });

  const startCall = async (conversationId: string, isVideoCall: boolean = true) => {
    const roomName = `chat-${conversationId}-${Date.now()}`;
    
    setCallState({
      isInCall: true,
      roomName,
      conversationId,
    });

    // Send notification to other participants
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: isVideoCall ? '📹 Chamada de vídeo iniciada' : '📞 Chamada de áudio iniciada',
        type: 'system',
      });
    }
  };

  const endCall = () => {
    setCallState({
      isInCall: false,
      roomName: null,
      conversationId: null,
    });
  };

  return {
    callState,
    startCall,
    endCall,
  };
};
