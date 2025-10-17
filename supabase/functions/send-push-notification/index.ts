// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Edge function para envio de notificações push com VAPID authentication
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função helper para gerar JWT VAPID
async function generateVapidJWT(audience: string): Promise<string> {
  const header = {
    typ: "JWT",
    alg: "ES256",
  };

  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: "mailto:admin@nossopapo.net",
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  
  // For now, return unsigned token (simplified version)
  // In production, this should be properly signed with VAPID_PRIVATE_KEY
  return `${unsignedToken}.UNSIGNED`;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  silent?: boolean;
  requireInteraction?: boolean;
}

interface NotificationRequest {
  recipientId: string;
  payload: PushPayload;
  category?: string;
  conversationId?: string;
  callId?: string;
  callType?: 'video' | 'audio';
  callerName?: string;
  callerAvatar?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[Push] 🔔 Nova requisição de notificação');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: NotificationRequest = await req.json();
    const { 
      recipientId, 
      payload, 
      category, 
      conversationId, 
      callId,
      callType,
      callerName,
      callerAvatar
    } = request;

    if (!recipientId || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Preparar payload específico para chamadas
    if (category === 'call' && callId) {
      console.log(`[Push] 📞 Notificação de chamada: ${callType} de ${callerName}`);
      
      const callPayload: PushPayload = {
        title: `📞 Chamada de ${callType === 'video' ? 'vídeo' : 'áudio'}`,
        body: `${callerName} está te chamando`,
        icon: callerAvatar || '/app-icon-192.png',
        badge: '/app-icon-192.png',
        tag: `call:${callId}`,
        data: {
          url: `/call/${callId}`,
          callId,
          conversationId,
          category: 'call',
          callType: callType || 'video',
          priority: 'urgent',
        },
        requireInteraction: true,
        silent: false,
      };
      
      Object.assign(payload, callPayload);
    }

    console.log(`[Push] 📱 Buscando subscriptions para: ${recipientId}`);

    // Buscar subscriptions ativas
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientId);

    if (fetchError) {
      console.error("[Push] ❌ Erro ao buscar subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] ⚠️ Nenhuma subscription encontrada');
      return new Response(
        JSON.stringify({
          success: true,
          message: "No subscriptions found",
          sent: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ordenar por mais recente
    const sortedDevices = [...subscriptions].sort((a, b) => {
      const dateA = new Date(a.last_used_at || 0).getTime();
      const dateB = new Date(b.last_used_at || 0).getTime();
      return dateB - dateA;
    });

    // Para chamadas, notificar TODOS os dispositivos (multi-device)
    // Para mensagens normais, apenas o mais recente
    const devicesToNotify = category === 'call' || payload.requireInteraction
      ? sortedDevices
      : sortedDevices.slice(0, 1);

    console.log(`[Push] 📤 Enviando para ${devicesToNotify.length}/${subscriptions.length} dispositivo(s)`);

    // Calcular badge count
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId || "")
      .neq("sender_id", recipientId);

    // Enviar notificações
    const results = await Promise.allSettled(
      devicesToNotify.map(async (subscription) => {
        try {
          const notificationPayload = JSON.stringify({
            notification: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || "/app-icon-192.png",
              badge: payload.badge || "/app-icon-192.png",
              tag: payload.tag || `msg-${Date.now()}`,
              data: {
                ...payload.data,
                url: payload.data?.url || "/app",
                notificationId: `${recipientId}-${Date.now()}`,
                category: category || 'messages',
              },
              silent: payload.silent || false,
              requireInteraction: payload.requireInteraction || false,
              renotify: category === 'call',
            },
            badge: unreadCount || 0,
          });

          // Extract audience from endpoint
          const endpointUrl = new URL(subscription.endpoint);
          const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
          
          // Generate VAPID JWT (simplified for now)
          const vapidToken = await generateVapidJWT(audience);

          console.log(`[Push] 📲 Enviando para ${subscription.device_name || "Unknown"}`);
          
          // Send push notification with VAPID headers
          const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': category === 'call' ? '30' : '86400', // 30s para chamadas, 24h para mensagens
              'Authorization': `vapid t=${vapidToken}, k=${VAPID_PUBLIC_KEY}`,
            },
            body: notificationPayload,
          });

          if (!response.ok) {
            throw new Error(`Push service responded with ${response.status}: ${await response.text()}`);
          }
          
          console.log(`[Push] ✅ Enviado com sucesso para ${subscription.device_name}`);

          // Atualizar last_used_at
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", subscription.id);

          // Registrar histórico
          await supabase.from("notification_history").insert({
            user_id: recipientId,
            conversation_id: conversationId,
            title: payload.title,
            body: payload.body,
            category: category || "messages",
            priority: payload.data?.priority || "normal",
          });

          // Analytics
          await supabase.from("analytics_events").insert({
            user_id: recipientId,
            event_type: "push_sent",
            event_data: {
              conversation_id: conversationId,
              category: category,
              priority: payload.data?.priority,
              device: subscription.device_name,
            },
          });

          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          console.error(`[Push] ❌ Falha ao enviar:`, error);

          // Remover subscriptions inválidas
          const errorMessage = error.message || String(error);
          const shouldRemove = errorMessage.includes("410") || 
                             errorMessage.includes("404") ||
                             errorMessage.includes("expired") ||
                             errorMessage.includes("unregistered");

          if (shouldRemove) {
            console.log(`[Push] 🗑️ Removendo subscription inválida: ${subscription.id}`);
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
          }

          return { success: false, endpoint: subscription.endpoint, error: errorMessage };
        }
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled" && (r.value as any).success).length;

    console.log(`[Push] 📊 Resultado: ${successCount}/${results.length} enviadas`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Push] ❌ Erro geral:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
