// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Dialog de chamadas recebidas estilo WhatsApp/Telegram

import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { CallType } from '@/utils/WebRTCCall';

interface IncomingNativeCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingNativeCallDialog = ({
  open,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}: IncomingNativeCallDialogProps) => {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md bg-gradient-to-b from-gray-900 to-black border-none text-white">
        {/* Títulos para acessibilidade (visualmente ocultos) */}
        <DialogTitle className="sr-only">
          Chamada recebida de {callerName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {callType === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio'} recebida. 
          Pressione Aceitar para atender ou Recusar para rejeitar.
        </DialogDescription>

        <div className="flex flex-col items-center py-8">
          {/* Avatar com animação de pulse */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
            className="relative"
          >
            <Avatar className="w-32 h-32 ring-4 ring-primary/50">
              <AvatarImage src={callerAvatar} />
              <AvatarFallback className="bg-primary/20 text-4xl">
                {callerName?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Ondas de chamada */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-primary"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{
                  scale: [1, 1.5, 2],
                  opacity: [0.6, 0.3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.6,
                }}
              />
            ))}
          </motion.div>

          {/* Informações da chamada */}
          <div className="mt-6 text-center">
            <h2 className="text-2xl font-semibold">{callerName}</h2>
            <p className="mt-2 text-lg text-white/70 flex items-center justify-center gap-2">
              {callType === 'video' ? (
                <>
                  <Video size={20} />
                  Chamada de vídeo recebida
                </>
              ) : (
                <>
                  <Phone size={20} />
                  Chamada de áudio recebida
                </>
              )}
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-12 mt-12">
            {/* Botão Rejeitar */}
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <Button
                size="lg"
                variant="destructive"
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl"
                onClick={onReject}
              >
                <PhoneOff size={28} />
              </Button>
              <span className="text-sm text-white/70">Recusar</span>
            </motion.div>

            {/* Botão Aceitar */}
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <Button
                size="lg"
                className="w-20 h-20 rounded-full bg-green-600 hover:bg-green-700 shadow-2xl"
                onClick={onAccept}
              >
                {callType === 'video' ? (
                  <Video size={28} />
                ) : (
                  <Phone size={28} />
                )}
              </Button>
              <span className="text-sm text-white/70">Aceitar</span>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
