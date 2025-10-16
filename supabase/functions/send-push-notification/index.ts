// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// ✅ FASE 2: Implementação simplificada sem web-push (fetch direto)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  data?: Record<string, any>;
  silent?: boolean;
  requireInteraction?: boolean;
}

interface NotificationRequest {
  recipientId: string;
  payload: PushPayload;
  category?: string;
  conversationId?: string;
  sessionId?: string;
  groupName?: string;
  hostName?: string;
  callType?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { 
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log('[Push] 🔔 Processando requisição de notificação');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: NotificationRequest = await req.json();
    const { 
      recipientId, 
      payload, 
      category, 
      conversationId, 
      sessionId, 
      groupName, 
      hostName, 
      callType 
    } = request;

    if (!recipientId || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Processar notificações de chamada em grupo
    if (category === 'group-call' && sessionId && groupName) {
      console.log(`[Push] 📞 Notificação de chamada em grupo: ${groupName}`);
      
      const groupCallPayload: PushPayload = {
        title: `📞 Chamada em ${groupName}`,
        body: `${hostName || 'Alguém'} está chamando o grupo`,
        icon: payload.icon || '/app-icon-192.png',
        badge: '/app-icon-192.png',
        tag: `group-call-${sessionId}`,
        data: {
          url: `/chat/${conversationId}?session=${sessionId}`,
          sessionId,
          conversationId,
          category: 'group-call',
          callType: callType || 'video',
        },
        requireInteraction: true,
        silent: false,
      };
      
      // Substituir payload original pelo de chamada em grupo
      Object.assign(payload, groupCallPayload);
    }

    console.log(`[Push] 📱 Buscando subscriptions para: ${recipientId}`);

    // Buscar subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientId);

    if (fetchError) {
      console.error("[Push] ❌ Erro ao buscar subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
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
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Ordenar por mais recente
    const sortedDevices = [...subscriptions].sort((a, b) => {
      const dateA = new Date(a.last_used_at || 0).getTime();
      const dateB = new Date(b.last_used_at || 0).getTime();
      return dateB - dateA;
    });

    // Determinar dispositivos a notificar
    const devicesToNotify = payload.requireInteraction || payload.data?.priority === "urgent"
      ? sortedDevices
      : sortedDevices.slice(0, 1);

    console.log(`[Push] 📤 Enviando para ${devicesToNotify.length}/${subscriptions.length} dispositivo(s)`);

    // Calcular badge count
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", payload.data?.conversationId || "")
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
                url: payload.data?.url || "/",
                notificationId: `${recipientId}-${Date.now()}`,
              },
              silent: payload.silent || false,
              requireInteraction: payload.requireInteraction || false,
              renotify: true,
            },
            badge: unreadCount || 0,
          });

          // Atualizar last_used_at
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", subscription.id);

          console.log(`[Push] 📲 Enviando para ${subscription.device_name || "Unknown"}`);
          
          // ✅ FASE 2: Fetch direto ao push service (simplificado)
          const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '86400',
            },
            body: notificationPayload,
          });

          if (!response.ok) {
            throw new Error(`Push service responded with ${response.status}`);
          }
          
          console.log(`[Push] ✅ Enviado com sucesso para ${subscription.device_name}`);

          // Registrar histórico
          await supabase.from("notification_history").insert({
            user_id: recipientId,
            conversation_id: payload.data?.conversationId,
            title: payload.title,
            body: payload.body,
            category: payload.data?.category || "messages",
            priority: payload.data?.priority || "normal",
          });

          // Analytics
          await supabase.from("analytics_events").insert({
            user_id: recipientId,
            event_type: "push_sent",
            event_data: {
              conversation_id: payload.data?.conversationId,
              category: payload.data?.category,
              priority: payload.data?.priority,
              device: subscription.device_name,
            },
          });

          return { success: true, endpoint: subscription.endpoint };
        } catch (error) {
          console.error(`[Push] ❌ Falha ao enviar:`, error);

          // Remover subscriptions inválidas
          const errorMessage = error instanceof Error ? error.message : String(error);
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

          return { success: false, endpoint: subscription.endpoint, error };
        }
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;

    console.log(`[Push] 📊 Resultado: ${successCount}/${results.length} enviadas`);

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
    console.error("[Push] ❌ Erro geral:", error);
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
