// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Controles para chamadas em grupo

import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupCallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSwitchCamera?: () => void;
  onEndCall: () => void;
  isHost?: boolean;
  activeCount?: number;
}

export const GroupCallControls = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
  isHost = false,
  activeCount = 0,
}: GroupCallControlsProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/90 to-transparent backdrop-blur-sm">
      <div className="flex items-center justify-center gap-4">
        {/* Toggle Áudio */}
        <Button
          size="lg"
          variant={isAudioEnabled ? "default" : "destructive"}
          className={cn(
            "h-14 w-14 rounded-full",
            !isAudioEnabled && "bg-destructive hover:bg-destructive/90"
          )}
          onClick={onToggleAudio}
        >
          {isAudioEnabled ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </Button>

        {/* Toggle Vídeo */}
        <Button
          size="lg"
          variant={isVideoEnabled ? "default" : "destructive"}
          className={cn(
            "h-14 w-14 rounded-full",
            !isVideoEnabled && "bg-destructive hover:bg-destructive/90"
          )}
          onClick={onToggleVideo}
        >
          {isVideoEnabled ? (
            <Video className="h-6 w-6" />
          ) : (
            <VideoOff className="h-6 w-6" />
          )}
        </Button>

        {/* Alternar Câmera (apenas mobile/vídeo) */}
        {isVideoEnabled && onSwitchCamera && (
          <Button
            size="lg"
            variant="secondary"
            className="h-14 w-14 rounded-full"
            onClick={onSwitchCamera}
          >
            <SwitchCamera className="h-6 w-6" />
          </Button>
        )}

        {/* Encerrar Chamada */}
        <Button
          size="lg"
          variant="destructive"
          className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90"
          onClick={onEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>

      {/* Info adicional */}
      {activeCount > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {activeCount} {activeCount === 1 ? 'participante' : 'participantes'} na chamada
          </p>
        </div>
      )}
    </div>
  );
};
