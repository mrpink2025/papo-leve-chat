import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNotificationPreferences } from './useNotificationPreferences';
import { useConversationNotifications } from './useConversationNotifications';
import {
  useNotificationCategories,
  NotificationCategory,
  NotificationPriority,
} from './useNotificationCategories';
import { useNotificationRateLimit } from './useNotificationRateLimit';
import { useNotificationGrouping } from './useNotificationGrouping';
import { useNotificationTelemetry } from './useNotificationTelemetry';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationRequest {
  conversationId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  isMention?: boolean;
  messageId?: string;
  senderId?: string;
  icon?: string;
  avatar?: string;
}

interface NotificationDecision {
  shouldSend: boolean;
  reason?: string;
  priority: NotificationPriority;
  shouldGroup: boolean;
  groupedCount?: number;
}

export const useNotificationManager = () => {
  const { user } = useAuth();
  const { shouldShowNotification: shouldShowGlobal } = useNotificationPreferences();
  const { getCategorySettings, getCategoryPriority } = useNotificationCategories();
  const { checkRateLimit, incrementRateLimit } = useNotificationRateLimit();
  const { shouldGroupNotification } = useNotificationGrouping();
  const { trackSent, trackFailed, trackBlocked } = useNotificationTelemetry();

  // Decisão completa: deve enviar notificação?
  const shouldSendNotification = useCallback(async (
    request: NotificationRequest
  ): Promise<NotificationDecision> => {
    if (!user?.id) {
      return {
        shouldSend: false,
        reason: 'Usuário não autenticado',
        priority: 'normal',
        shouldGroup: false,
      };
    }

    const priority = getCategoryPriority(request.category);

    // 1. Verificar preferências globais
    if (!shouldShowGlobal()) {
      return {
        shouldSend: false,
        reason: 'Notificações desativadas globalmente ou Quiet Hours ativo',
        priority,
        shouldGroup: false,
      };
    }

    // 2. Verificar preferências de categoria
    const categorySettings = getCategorySettings(request.category);
    if (!categorySettings.enabled) {
      return {
        shouldSend: false,
        reason: `Categoria ${request.category} desativada`,
        priority,
        shouldGroup: false,
      };
    }

    // 3. Verificar preferências da conversa (usar hook dentro do componente)
    // Nota: Esta verificação será feita no componente que usa este hook
    // porque useConversationNotifications precisa do conversationId como prop

    // 4. Verificar rate limiting
    const rateLimitCheck = await checkRateLimit(
      user.id,
      request.conversationId,
      request.category
    );

    if (!rateLimitCheck.allowed) {
      return {
        shouldSend: false,
        reason: rateLimitCheck.reason,
        priority,
        shouldGroup: true, // Se excedeu limite, agrupar
      };
    }

    // 5. Verificar agrupamento
    const groupResult = await shouldGroupNotification({
      userId: user.id,
      conversationId: request.conversationId,
      category: request.category,
      priority,
      title: request.title,
      body: request.body,
    });

    const shouldGroup = categorySettings.group_similar && 
                       groupResult?.shouldGroup === true;

    // 6. Incrementar rate limit
    await incrementRateLimit(user.id, request.conversationId, request.category);

    return {
      shouldSend: true,
      priority,
      shouldGroup,
      groupedCount: groupResult?.groupedCount,
    };
  }, [
    user,
    shouldShowGlobal,
    getCategorySettings,
    getCategoryPriority,
    checkRateLimit,
    incrementRateLimit,
    shouldGroupNotification,
  ]);

  // Enviar notificação via Edge Function
  const sendNotification = useCallback(async (
    request: NotificationRequest
  ): Promise<boolean> => {
    const startTime = Date.now();
    
    try {
      const decision = await shouldSendNotification(request);

      if (!decision.shouldSend) {
        console.log(`Notificação bloqueada: ${decision.reason}`);
        // Track bloqueio
        await trackBlocked(request.category, request.conversationId, decision.reason || 'Unknown');
        return false;
      }

      // Preparar payload com privacidade (dados mínimos)
      const categorySettings = getCategorySettings(request.category);
      
      let body = request.body;
      // Para privacidade, truncar corpo se muito longo
      if (body.length > 100) {
        body = body.substring(0, 97) + '...';
      }
      
      if (decision.shouldGroup && decision.groupedCount && decision.groupedCount > 1) {
        body = `${decision.groupedCount} novas mensagens`;
      }

      const payload = {
        title: request.title,
        body, // Corpo truncado para privacidade
        icon: '/app-icon-192.png', // Usar ícone padrão por privacidade
        badge: '/app-icon-192.png',
        tag: `conv-${request.conversationId}`, // Tag para agrupar por conversa
        data: {
          url: `/chat/${request.conversationId}`,
          conversationId: request.conversationId,
          // Não incluir messageId ou outros dados sensíveis por privacidade
          category: request.category,
          priority: decision.priority,
        },
        // Configurações baseadas nas preferências
        silent: !categorySettings.sound_enabled,
        requireInteraction: decision.priority === 'urgent',
      };

      // Invocar edge function
      const { data, error } = await supabase.functions.invoke(
        'send-push-notification',
        {
          body: {
            recipientId: user?.id,
            payload,
          },
        }
      );

      if (error) {
        console.error('Erro ao enviar notificação:', error);
        // Track falha
        await trackFailed(request.category, request.conversationId, error.message);
        return false;
      }

      // Track sucesso com latência
      await trackSent(request.category, request.conversationId, startTime);
      
      console.log('Notificação enviada:', data, `Latência: ${Date.now() - startTime}ms`);
      return true;
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
      // Track falha
      await trackFailed(
        request.category,
        request.conversationId,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }, [user, shouldSendNotification, getCategorySettings, trackSent, trackFailed, trackBlocked]);

  // Enviar notificação de mensagem
  const notifyNewMessage = useCallback(async (
    conversationId: string,
    senderId: string,
    senderName: string,
    messageContent: string,
    messageId: string,
    senderAvatar?: string,
    isMention: boolean = false
  ) => {
    // Não notificar se é a própria mensagem
    if (senderId === user?.id) return false;

    const category: NotificationCategory = isMention ? 'mentions' : 'messages';

    return await sendNotification({
      conversationId,
      category,
      title: senderName,
      body: messageContent,
      messageId,
      senderId,
      avatar: senderAvatar,
      isMention,
    });
  }, [user, sendNotification]);

  // Enviar notificação de reação
  const notifyReaction = useCallback(async (
    conversationId: string,
    reactorName: string,
    emoji: string,
    messagePreview: string,
    messageId: string
  ) => {
    return await sendNotification({
      conversationId,
      category: 'reactions',
      title: reactorName,
      body: `Reagiu com ${emoji} a: "${messagePreview}"`,
      messageId,
    });
  }, [sendNotification]);

  // Enviar notificação de chamada
  const notifyCall = useCallback(async (
    conversationId: string,
    callerName: string,
    isVideo: boolean = true,
    callerAvatar?: string
  ) => {
    return await sendNotification({
      conversationId,
      category: 'calls',
      title: `${isVideo ? '📹' : '📞'} ${callerName}`,
      body: isVideo ? 'Chamada de vídeo recebida' : 'Chamada de áudio recebida',
      avatar: callerAvatar,
    });
  }, [sendNotification]);

  // Enviar notificação de sistema
  const notifySystem = useCallback(async (
    conversationId: string,
    title: string,
    body: string
  ) => {
    return await sendNotification({
      conversationId,
      category: 'system',
      title,
      body,
    });
  }, [sendNotification]);

  return {
    shouldSendNotification,
    sendNotification,
    notifyNewMessage,
    notifyReaction,
    notifyCall,
    notifySystem,
  };
};
