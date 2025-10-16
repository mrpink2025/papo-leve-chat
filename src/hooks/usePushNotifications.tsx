import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

// VAPID Public Key - você precisará gerar um par de chaves VAPID
const VAPID_PUBLIC_KEY = 'PLACEHOLDER_VAPID_PUBLIC_KEY';

interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar permissão atual ao carregar
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [user]);

  // Verificar se já existe uma inscrição ativa
  const checkExistingSubscription = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setIsSubscribed(true);
        
        // Atualizar last_used_at no banco
        const keys = subscription.toJSON().keys;
        if (keys?.p256dh && keys?.auth) {
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('endpoint', subscription.endpoint)
            .eq('user_id', user.id);
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Erro ao verificar inscrição push:', error);
    }
  }, [user]);

  // Converter VAPID key de Base64 para Uint8Array
  const urlBase64ToUint8Array = (base64String: string): BufferSource => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Solicitar permissão e inscrever para notificações
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado para ativar notificações.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Solicitar permissão
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'Você precisará permitir notificações nas configurações do navegador.',
          variant: 'destructive',
        });
        return false;
      }

      // Inscrever para push notifications
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar se VAPID key está configurada
      if (VAPID_PUBLIC_KEY === 'PLACEHOLDER_VAPID_PUBLIC_KEY') {
        console.warn('VAPID key não configurada. Usando modo de teste.');
        
        toast({
          title: 'Configuração necessária',
          description: 'As chaves VAPID precisam ser configuradas no servidor.',
        });
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Salvar inscrição no banco
      const subscriptionData = subscription.toJSON();
      const keys = subscriptionData.keys;

      if (!keys?.p256dh || !keys?.auth || !subscriptionData.endpoint) {
        throw new Error('Dados de inscrição inválidos');
      }

      const deviceName = getDeviceName();
      const userAgent = navigator.userAgent;

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          device_name: deviceName,
          user_agent: userAgent,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'endpoint',
        });

      if (error) throw error;

      setIsSubscribed(true);
      
      toast({
        title: '✅ Notificações ativadas',
        description: 'Você receberá notificações de novas mensagens.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar as notificações. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user || !('serviceWorker' in navigator)) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remover do banco
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id);
      }

      setIsSubscribed(false);
      
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações push.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar as notificações.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    requestPermission,
    unsubscribe,
  };
};

// Utilitário para identificar o dispositivo
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    return 'Mobile';
  }
  
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Win/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  
  return 'Desktop';
}
