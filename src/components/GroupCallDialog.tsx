// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// UI principal da chamada em grupo com grade dinâmica

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { VideoTile } from '@/components/VideoTile';
import { GroupCallControls } from '@/components/GroupCallControls';
import { GroupCallHookState } from '@/hooks/useGroupVideoCall';
import { cn } from '@/lib/utils';

interface GroupCallDialogProps {
  callState: GroupCallHookState;
  onEndCall: () => void;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onSwitchCamera?: () => void;
}

export const GroupCallDialog = ({ 
  callState, 
  onEndCall, 
  onToggleVideo,
  onToggleAudio,
  onSwitchCamera
}: GroupCallDialogProps) => {
  const participants = Array.from(callState.participants.values());
  const totalParticipants = participants.length + 1; // +1 para incluir o próprio usuário
  
  // Layout dinâmico baseado no número de participantes
  const getGridLayout = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2 grid-rows-2';
    if (totalParticipants <= 6) return 'grid-cols-3 grid-rows-2';
    if (totalParticipants <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-3'; // Max 12
  };
  
  const activeCount = participants.filter(p => p.status === 'JOINED').length + 1; // +1 para o próprio usuário
  
  return (
    <Dialog open={callState.isInCall} onOpenChange={onEndCall}>
      <DialogContent className="max-w-full h-full p-0 bg-background border-0">
        <div className="relative w-full h-full">
          {/* Grade de participantes */}
          <div className={cn(
            "grid gap-2 h-full p-4",
            getGridLayout()
          )}>
            {/* Tile do próprio usuário */}
            <VideoTile
              stream={callState.localStream || undefined}
              userName="Você"
              isLocal={true}
            />
            
            {/* Tiles dos participantes remotos */}
            {participants.map(participant => (
              <VideoTile
                key={participant.userId}
                stream={participant.stream}
                userName={participant.username}
                userAvatar={participant.avatar}
                status={participant.status}
                isLocal={false}
              />
            ))}
          </div>
          
          {/* Controles (mutar, câmera, encerrar) */}
          <GroupCallControls 
            isAudioEnabled={callState.isAudioEnabled}
            isVideoEnabled={callState.isVideoEnabled}
            onToggleAudio={onToggleAudio}
            onToggleVideo={onToggleVideo}
            onSwitchCamera={onSwitchCamera}
            onEndCall={onEndCall}
            isHost={callState.isHost}
            activeCount={activeCount}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
