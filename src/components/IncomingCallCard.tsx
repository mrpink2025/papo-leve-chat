import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallNotification } from '@/hooks/useCallNotifications';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallCardProps {
  call: CallNotification;
  onAnswer: () => void;
  onDecline: () => void;
  isAnswering?: boolean;
  isDeclining?: boolean;
}

/**
 * Cartão de chamada recebida
 * - Mostra informações do chamador
 * - Botões Atender/Recusar
 * - Animação pulsante
 * - Timer de duração
 */
export const IncomingCallCard = ({
  call,
  onAnswer,
  onDecline,
  isAnswering = false,
  isDeclining = false,
}: IncomingCallCardProps) => {
  const [duration, setDuration] = useState(0);

  // Timer de duração
  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = new Date(call.started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.started_at]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const callerName = call.caller?.full_name || call.caller?.username || 'Usuário Desconhecido';
  const callerInitials = callerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <Card className="bg-gradient-to-br from-primary/90 to-primary shadow-2xl border-0 backdrop-blur-lg">
          <div className="p-6">
            {/* Chamador */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Avatar className="h-16 w-16 ring-4 ring-white/30">
                  <AvatarImage src={call.caller?.avatar_url} />
                  <AvatarFallback className="bg-primary-foreground text-primary text-xl font-bold">
                    {callerInitials}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{callerName}</h3>
                <div className="flex items-center gap-2 text-white/80">
                  {call.call_type === 'video' ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {call.call_type === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio'}
                  </span>
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className="text-center mb-6">
              <p className="text-white/80 text-sm mb-1">Chamando...</p>
              <p className="text-white text-2xl font-mono font-bold">{formatDuration(duration)}</p>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              {/* Recusar */}
              <Button
                onClick={onDecline}
                disabled={isAnswering || isDeclining}
                variant="destructive"
                size="lg"
                className="flex-1 h-14 gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg"
              >
                <PhoneOff className="h-5 w-5" />
                {isDeclining ? 'Recusando...' : 'Recusar'}
              </Button>

              {/* Atender */}
              <Button
                onClick={onAnswer}
                disabled={isAnswering || isDeclining}
                size="lg"
                className="flex-1 h-14 gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold shadow-lg"
              >
                {call.call_type === 'video' ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <Phone className="h-5 w-5" />
                )}
                {isAnswering ? 'Atendendo...' : 'Atender'}
              </Button>
            </div>
          </div>

          {/* Animação de onda */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: [
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)',
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
