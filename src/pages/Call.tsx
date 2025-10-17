// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Página dedicada para chamadas diretas via notificação push
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNativeVideoCall } from '@/hooks/useNativeVideoCall';
import { supabase } from '@/integrations/supabase/client';
import { NativeCallDialog } from '@/components/NativeCallDialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Call() {
  const { callId } = useParams<{ callId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callData, setCallData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { 
    callState, 
    answerCall, 
    endCall, 
    toggleVideo, 
    toggleAudio, 
    switchCamera,
    formatDuration 
  } = useNativeVideoCall();

  useEffect(() => {
    if (!callId || !user) {
      navigate('/app', { replace: true });
      return;
    }

    const loadCallData = async () => {
      try {
        console.log('[Call] 📞 Carregando dados da chamada:', callId);
        
        const { data: call, error } = await supabase
          .from('call_notifications')
          .select('*')
          .eq('id', callId)
          .single();

        if (error) throw error;

        if (!call) {
          toast({
            title: 'Chamada não encontrada',
            description: 'Esta chamada pode ter sido encerrada.',
            variant: 'destructive',
          });
          navigate('/app', { replace: true });
          return;
        }

        // Buscar perfil do caller separadamente
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', call.caller_id)
          .single();

        // Verificar se a chamada ainda está ativa
        if (call.status === 'ended' || call.status === 'missed' || call.status === 'declined') {
          toast({
            title: 'Chamada encerrada',
            description: 'Esta chamada já foi finalizada.',
            variant: 'destructive',
          });
          navigate('/app', { replace: true });
          return;
        }

        setCallData({ ...call, caller: callerProfile });
        
        // Atender automaticamente se status é "ringing"
        if (call.status === 'ringing' && callerProfile) {
          console.log('[Call] 📞 Atendendo chamada automaticamente...');
          await answerCall(
            callId,
            call.conversation_id,
            call.call_type as 'video' | 'audio',
            {
              name: callerProfile.full_name || callerProfile.username || 'Usuário',
              avatar: callerProfile.avatar_url || undefined
            }
          );
        }
      } catch (error) {
        console.error('[Call] ❌ Erro ao carregar chamada:', error);
        toast({
          title: 'Erro ao carregar chamada',
          description: 'Não foi possível carregar os dados da chamada.',
          variant: 'destructive',
        });
        navigate('/app', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadCallData();
  }, [callId, user, navigate, answerCall]);

  // Redirecionar ao encerrar chamada
  useEffect(() => {
    if (callState.status === 'ended') {
      console.log('[Call] 📞 Chamada encerrada, redirecionando...');
      setTimeout(() => {
        navigate('/app', { replace: true });
      }, 2000);
    }
  }, [callState.status, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Conectando à chamada...</p>
        </div>
      </div>
    );
  }

  if (!callData) {
    return null;
  }

  // Renderizar apenas se houver chamada ativa
  if (callState.status === 'ended' || !callState.isInCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <NativeCallDialog
        callState={callState}
        onEndCall={() => {
          endCall();
          navigate('/app', { replace: true });
        }}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onSwitchCamera={switchCamera}
        formatDuration={formatDuration}
      />
    </div>
  );
}
