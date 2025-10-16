// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Interface de chamada nativa estilo WhatsApp/Telegram

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Signal,
} from 'lucide-react';
import { NativeCallState } from '@/hooks/useNativeVideoCall';
import { cn } from '@/lib/utils';

interface NativeCallDialogProps {
  callState: NativeCallState;
  onEndCall: () => void;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onSwitchCamera: () => void;
  formatDuration: (seconds: number) => string;
}

export const NativeCallDialog = ({
  callState,
  onEndCall,
  onToggleVideo,
  onToggleAudio,
  onSwitchCamera,
  formatDuration,
}: NativeCallDialogProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Configurar stream local
  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState.localStream]);

  // Configurar stream remoto
  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  // Ícone de qualidade de conexão
  const renderConnectionQuality = () => {
    const bars = callState.connectionQuality === 'good' ? 3 
                 : callState.connectionQuality === 'medium' ? 2 
                 : 1;

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={cn(
              'w-1 rounded-full transition-all',
              bar <= bars ? 'bg-white' : 'bg-white/30',
              bar === 1 && 'h-2',
              bar === 2 && 'h-3',
              bar === 3 && 'h-4'
            )}
          />
        ))}
      </div>
    );
  };

  // Renderizar estado da chamada
  const renderCallStatus = () => {
    switch (callState.status) {
      case 'calling':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-lg text-white/90">Chamando...</p>
          </motion.div>
        );
      case 'connecting':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-lg text-white/90">Conectando...</p>
          </motion.div>
        );
      case 'reconnecting':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-lg text-white/90">Reconectando...</p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={callState.isInCall} onOpenChange={onEndCall}>
      <DialogContent className="max-w-full h-full p-0 bg-black border-none">
        {/* Acessibilidade */}
        <DialogTitle className="sr-only">
          Chamada {callState.callType === 'video' ? 'de vídeo' : 'de áudio'} com {callState.remoteUserInfo?.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {callState.status === 'connected' 
            ? `Chamada conectada - Duração: ${formatDuration(callState.duration)}`
            : `Status da chamada: ${callState.status}`
          }
        </DialogDescription>

        <div className="relative w-full h-full flex flex-col">
          {/* Vídeo remoto (tela principal) */}
          <div className="relative flex-1 bg-gradient-to-b from-gray-900 to-black">
            {callState.callType === 'video' && callState.remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              // Avatar quando não há vídeo
              <div className="w-full h-full flex flex-col items-center justify-center">
                <motion.div
                  animate={{
                    scale: callState.status === 'calling' ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: callState.status === 'calling' ? Infinity : 0,
                  }}
                >
                  <Avatar className="w-32 h-32 ring-4 ring-primary/50">
                    <AvatarImage src={callState.remoteUserInfo?.avatar} />
                    <AvatarFallback className="bg-primary/20 text-4xl">
                      {callState.remoteUserInfo?.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <h2 className="mt-6 text-2xl font-semibold text-white">
                  {callState.remoteUserInfo?.name}
                </h2>
              </div>
            )}

            {/* Overlay superior */}
            <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {callState.remoteUserInfo?.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {callState.status === 'connected' ? (
                      <>
                        <span className="text-sm text-white/80">
                          {formatDuration(callState.duration)}
                        </span>
                        <div className="flex items-center gap-1">
                          {renderConnectionQuality()}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-white/80 capitalize">
                        {callState.status === 'calling' && 'Chamando...'}
                        {callState.status === 'connecting' && 'Conectando...'}
                        {callState.status === 'reconnecting' && 'Reconectando...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Status da chamada (centro) */}
            {callState.status !== 'connected' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {renderCallStatus()}
              </div>
            )}

            {/* Vídeo local (mini preview) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-24 right-6 w-32 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
                style={{ transform: 'scaleX(-1)' }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </motion.div>
          </div>

          {/* Controles inferiores */}
          <div className="p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-6">
              {/* Botão de Áudio */}
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  size="lg"
                  variant={callState.isAudioEnabled ? "secondary" : "destructive"}
                  className="w-16 h-16 rounded-full"
                  onClick={onToggleAudio}
                  title={callState.isAudioEnabled ? "Desativar microfone" : "Ativar microfone"}
                >
                  {callState.isAudioEnabled ? (
                    <Mic size={24} />
                  ) : (
                    <MicOff size={24} />
                  )}
                </Button>
              </motion.div>

              {/* Botão de Encerrar */}
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700"
                  onClick={onEndCall}
                  title="Encerrar chamada"
                >
                  <PhoneOff size={28} />
                </Button>
              </motion.div>

              {/* Botão de Vídeo */}
              {callState.callType === 'video' && (
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    size="lg"
                    variant={callState.isVideoEnabled ? "secondary" : "destructive"}
                    className="w-16 h-16 rounded-full"
                    onClick={onToggleVideo}
                    title={callState.isVideoEnabled ? "Desativar câmera" : "Ativar câmera"}
                  >
                    {callState.isVideoEnabled ? (
                      <Video size={24} />
                    ) : (
                      <VideoOff size={24} />
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Botão de Trocar Câmera (mobile) */}
              {callState.callType === 'video' && callState.isVideoEnabled && (
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-16 h-16 rounded-full"
                    onClick={onSwitchCamera}
                    title="Trocar câmera"
                  >
                    <SwitchCamera size={24} />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
