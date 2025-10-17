// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Helper para enviar notificações push via edge function

import { supabase } from '@/integrations/supabase/client';

interface SendPushNotificationParams {
  recipientId: string;
  title: string;
  body: string;
  category?: string;
  conversationId?: string;
  callId?: string;
  callType?: 'video' | 'audio';
  callerName?: string;
  callerAvatar?: string;
  icon?: string;
  requireInteraction?: boolean;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
}

/**
 * Envia notificação push via edge function
 */
export async function sendPushNotification(params: SendPushNotificationParams): Promise<boolean> {
  try {
    console.log('[PushHelper] 📤 Enviando notificação push:', params);

    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        recipientId: params.recipientId,
        payload: {
          title: params.title,
          body: params.body,
          icon: params.icon,
          tag: params.callId ? `call:${params.callId}` : undefined,
          requireInteraction: params.requireInteraction,
          data: {
            conversationId: params.conversationId,
            callId: params.callId,
            category: params.category,
            priority: params.priority,
          },
        },
        category: params.category,
        conversationId: params.conversationId,
        callId: params.callId,
        callType: params.callType,
        callerName: params.callerName,
        callerAvatar: params.callerAvatar,
      },
    });

    if (error) {
      console.error('[PushHelper] ❌ Erro ao enviar notificação:', error);
      return false;
    }

    console.log('[PushHelper] ✅ Notificação enviada com sucesso:', data);
    return true;
  } catch (error) {
    console.error('[PushHelper] ❌ Exceção ao enviar notificação:', error);
    return false;
  }
}

/**
 * Envia notificação de chamada para um destinatário
 */
export async function sendCallNotification(
  recipientId: string,
  callId: string,
  conversationId: string,
  callType: 'video' | 'audio',
  callerName: string,
  callerAvatar?: string
): Promise<boolean> {
  return sendPushNotification({
    recipientId,
    callId,
    conversationId,
    callType,
    callerName,
    callerAvatar,
    title: `📞 Chamada de ${callType === 'video' ? 'vídeo' : 'áudio'}`,
    body: `${callerName} está te chamando`,
    category: 'call',
    requireInteraction: true,
    priority: 'urgent',
  });
}

/**
 * Cancela notificações de chamada em outros dispositivos
 * (envia uma notificação silenciosa com tag especial para fechar)
 */
export async function cancelCallNotifications(
  recipientId: string,
  callId: string
): Promise<boolean> {
  try {
    console.log('[PushHelper] 🚫 Cancelando notificações de chamada:', callId);

    // Enviar mensagem silenciosa para fechar notificações
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        recipientId,
        payload: {
          title: 'Call ended',
          body: 'Call ended',
          tag: `call:${callId}`,
          silent: true,
          requireInteraction: false,
          data: {
            action: 'cancel-call',
            callId,
            category: 'call',
          },
        },
        category: 'call-cancel',
        callId,
      },
    });

    if (error) {
      console.error('[PushHelper] ❌ Erro ao cancelar notificações:', error);
      return false;
    }

    console.log('[PushHelper] ✅ Notificações canceladas com sucesso');
    return true;
  } catch (error) {
    console.error('[PushHelper] ❌ Exceção ao cancelar notificações:', error);
    return false;
  }
}
