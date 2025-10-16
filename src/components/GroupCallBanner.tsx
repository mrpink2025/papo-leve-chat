// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Banner exibido no chat quando há chamada em grupo em andamento

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Phone, PhoneCall } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { CallType } from '@/utils/GroupWebRTCCall';

interface GroupCallBannerProps {
  conversationId: string;
  onJoinCall: (sessionId: string, callType: CallType) => void;
}

export const GroupCallBanner = ({ 
  conversationId, 
  onJoinCall 
}: GroupCallBannerProps) => {
  const { data: session, refetch } = useQuery({
    queryKey: ['active-group-call', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_call_sessions')
        .select(`
          id,
          call_type,
          state,
          created_at,
          participants:group_call_participants(user_id, status)
        `)
        .eq('conversation_id', conversationId)
        .in('state', ['DIALING', 'ACTIVE', 'COOLDOWN'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('[GroupCallBanner] Erro ao buscar sessão:', error);
        return null;
      }
      
      return data;
    },
    refetchInterval: 3000, // Atualizar a cada 3s
  });
  
  useEffect(() => {
    if (!conversationId) return;
    
    // Escutar mudanças na sessão via Realtime
    const channel = supabase
      .channel(`group-call-session:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_call_sessions',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        console.log('[GroupCallBanner] Mudança detectada, recarregando...');
        refetch();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_call_participants',
      }, () => {
        console.log('[GroupCallBanner] Participante mudou, recarregando...');
        refetch();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch]);
  
  if (!session || session.state === 'ENDED') return null;
  
  const participants = session.participants as Array<{ user_id: string; status: string }>;
  const activeCount = participants?.filter(p => p.status === 'JOINED').length || 0;
  
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bg-primary/10 backdrop-blur-sm border-b border-primary/20 p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <PhoneCall className="text-primary" size={24} />
        </motion.div>
        <div>
          <p className="font-semibold text-foreground">
            Chamada em grupo em andamento
          </p>
          <p className="text-sm text-muted-foreground">
            {activeCount} {activeCount === 1 ? 'participante' : 'participantes'} na chamada
          </p>
        </div>
      </div>
      
      <Button 
        onClick={() => onJoinCall(session.id, session.call_type as CallType)}
        className="gap-2 bg-primary hover:bg-primary/90"
      >
        <Phone size={16} />
        Participar
      </Button>
    </motion.div>
  );
};
