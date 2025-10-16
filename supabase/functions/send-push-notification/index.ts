// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7"; // ✅ Versão corrigida

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    conversationId?: string;
    messageId?: string;
    category?: string;
    priority?: string;
  };
  silent?: boolean;
  requireInteraction?: boolean;
}

interface NotificationRequest {
  recipientId: string;
  payload: PushPayload;
}

interface DeviceInfo {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name: string | null;
  last_used_at: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar método
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { 
        status: 401,
        headers: corsHeaders 
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parsear requisição
    const { recipientId, payload }: NotificationRequest = await req.json();

    if (!recipientId || !payload) {
      return new Response("Missing required fields", { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Verificar se VAPID keys estão configuradas
    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Push notifications not configured",
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Configurar VAPID para web-push
    webpush.setVapidDetails(
      'mailto:admin@nossopapo.net',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Buscar todas as inscrições do destinatário
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientId);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No subscriptions found for user",
          sent: 0,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Priorizar dispositivo mais recente (deduplicação inteligente)
    const sortedDevices = [...subscriptions].sort((a, b) => {
      const dateA = new Date(a.last_used_at || 0).getTime();
      const dateB = new Date(b.last_used_at || 0).getTime();
      return dateB - dateA; // Mais recente primeiro
    });

    // Se for notificação urgente, enviar para todos
    // Senão, enviar apenas para o dispositivo mais recente
    const devicesToNotify =
      payload.requireInteraction || payload.data?.priority === "urgent"
        ? sortedDevices
        : sortedDevices.slice(0, 1); // Apenas o mais recente

    console.log(
      `Sending to ${devicesToNotify.length} of ${subscriptions.length} devices`
    );

    // Calcular badge count (mensagens não lidas)
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", payload.data?.conversationId || "")
      .neq("sender_id", recipientId)
      .not("id", "in", `(
        SELECT message_id 
        FROM message_status 
        WHERE user_id = '${recipientId}' 
        AND status IN ('read', 'delivered')
      )`);

    // Enviar notificação para dispositivos selecionados
    const results = await Promise.allSettled(
      devicesToNotify.map(async (subscription) => {
        try {
          // Preparar payload
          const notificationPayload = JSON.stringify({
            notification: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || "/app-icon-192.png",
              badge: payload.badge || "/app-icon-192.png",
              tag: payload.tag || `msg-${Date.now()}`,
              data: {
                ...payload.data,
                url: payload.data?.url || "/",
                notificationId: `${recipientId}-${Date.now()}`,
              },
              silent: payload.silent || false,
              requireInteraction: payload.requireInteraction || false,
              renotify: true, // Permitir re-notificação com mesmo tag
            },
            badge: unreadCount || 0, // Badge count para sincronizar
          });

          // Atualizar last_used_at do dispositivo
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", subscription.id);

          // Enviar push notification real via Web Push API usando biblioteca web-push
          console.log(`[Push] Sending to ${subscription.device_name || "Unknown device"}`);
          console.log(`[Push] Endpoint: ${subscription.endpoint.substring(0, 50)}...`);
          console.log(`[Push] Badge count: ${unreadCount || 0}`);
          
          // Montar objeto de subscription para web-push
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          // Enviar usando web-push (faz criptografia e VAPID automaticamente)
          await webpush.sendNotification(
            pushSubscription,
            notificationPayload,
            {
              TTL: 86400, // 24 horas
            }
          );
          
          console.log(`[Push] Successfully sent to ${subscription.device_name}`);

          // Registrar na história de notificações
          await supabase.from("notification_history").insert({
            user_id: recipientId,
            conversation_id: payload.data?.conversationId,
            title: payload.title,
            body: payload.body,
            category: payload.data?.category || "messages",
            priority: payload.data?.priority || "normal",
          });

          // Registrar analytics
          await supabase.from("analytics_events").insert({
            user_id: recipientId,
            event_type: "np_push_sent",
            event_data: {
              conversation_id: payload.data?.conversationId,
              category: payload.data?.category,
              priority: payload.data?.priority,
            },
          });

          return { success: true, endpoint: subscription.endpoint };
        } catch (error) {
          console.error(`Failed to send to ${subscription.endpoint}:`, error);

          // Se o endpoint não é mais válido (410 ou 404), remover da base
          const is410or404 = error instanceof Error && 
            (error.message.includes("410") || 
             error.message.includes("404") ||
             error.message.includes("expired") ||
             error.message.includes("unregistered"));

          if (is410or404) {
            console.log(`Removing invalid subscription: ${subscription.id}`);
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
          }

          return { success: false, endpoint: subscription.endpoint, error };
        }
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
