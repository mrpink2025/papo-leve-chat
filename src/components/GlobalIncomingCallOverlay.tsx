// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Overlay global para chamadas recebidas (funciona em qualquer rota)

import { IncomingNativeCallDialog } from './IncomingNativeCallDialog';
import { NativeCallDialog } from './NativeCallDialog';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { useNativeVideoCall } from '@/hooks/useNativeVideoCall';
import { useAuth } from '@/hooks/useAuth';

export const GlobalIncomingCallOverlay = () => {
  const { user } = useAuth();
  const { incomingCall, acceptCall, rejectCall, clearIncomingCall } = useIncomingCalls(user?.id);
  const {
    callState,
    answerCall,
    endCall,
    toggleVideo,
    toggleAudio,
    switchCamera,
    formatDuration
  } = useNativeVideoCall();

  console.log('[GlobalIncomingCallOverlay] Estado:', {
    hasIncomingCall: !!incomingCall,
    isInCall: callState.isInCall,
    route: window.location.pathname
  });

  return (
    <>
      {/* Chamada ativa */}
      {callState.isInCall && (
        <NativeCallDialog
          callState={callState}
          onEndCall={endCall}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onSwitchCamera={switchCamera}
          formatDuration={formatDuration}
        />
      )}

      {/* Chamada recebida */}
      {incomingCall && !callState.isInCall && (
        <IncomingNativeCallDialog
          open={true}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onAccept={() => {
            console.log('[GlobalIncomingCallOverlay] Atendendo chamada:', incomingCall.callId);
            acceptCall();
            answerCall(
              incomingCall.callId,
              incomingCall.conversationId,
              incomingCall.callType,
              {
                name: incomingCall.callerName,
                avatar: incomingCall.callerAvatar,
              }
            );
            clearIncomingCall();
          }}
          onReject={() => {
            console.log('[GlobalIncomingCallOverlay] Rejeitando chamada');
            rejectCall();
          }}
        />
      )}
    </>
  );
};
