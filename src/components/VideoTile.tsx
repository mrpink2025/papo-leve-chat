// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Componente para exibir cada participante da chamada em grupo

import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Participant } from '@/utils/GroupWebRTCCall';

interface VideoTileProps {
  stream?: MediaStream;
  userName: string;
  userAvatar?: string;
  status?: 'INVITED' | 'RINGING' | 'JOINED' | 'REJECTED' | 'TIMEOUT' | 'LEFT';
  isLocal?: boolean;
  isSpeaking?: boolean;
}

export const VideoTile = ({ 
  stream, 
  userName, 
  userAvatar,
  status, 
  isLocal = false,
  isSpeaking = false
}: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  const hasVideo = stream?.getVideoTracks().some(t => t.enabled);
  const hasAudio = stream?.getAudioTracks().some(t => t.enabled);
  
  return (
    <div className={cn(
      "relative bg-muted rounded-lg overflow-hidden aspect-video",
      isSpeaking && "ring-2 ring-primary"
    )}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && "scale-x-[-1]" // Espelhar vídeo local
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Avatar className="w-20 h-20">
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="text-2xl">
              {userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Nome do usuário */}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-2">
        <span className="text-foreground text-sm font-medium">{isLocal ? 'Você' : userName}</span>
        {!hasAudio && (
          <svg className="w-4 h-4 text-destructive" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 5a3 3 0 013 3v1.293l-3-3V5zm-6 8a1 1 0 011-1h1v-1a5 5 0 015-5h.293l-1.414-1.414A5.001 5.001 0 004 11v1H3a1 1 0 00-1 1zm4 0a1 1 0 011-1h.293l-1.707-1.707A1 1 0 008 13z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      
      {/* Status de chamando/conectando */}
      {status === 'RINGING' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-foreground text-sm">Chamando...</p>
          </div>
        </div>
      )}
      
      {status === 'TIMEOUT' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-muted-foreground text-sm">Sem resposta</p>
        </div>
      )}
    </div>
  );
};
