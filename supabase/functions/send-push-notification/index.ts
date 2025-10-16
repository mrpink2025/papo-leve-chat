import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");

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
  };
}

interface NotificationRequest {
  recipientId: string;
  payload: PushPayload;
}

serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parsear requisição
    const { recipientId, payload }: NotificationRequest = await req.json();

    if (!recipientId || !payload) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Verificar se VAPID keys estão configuradas
    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Push notifications not configured",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Buscar todas as inscrições do destinatário
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientId);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No subscriptions found for user",
          sent: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Enviar notificação para cada dispositivo
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          // Preparar payload
          const notificationPayload = JSON.stringify({
            notification: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || "/app-icon-192.png",
              badge: payload.badge || "/app-icon-192.png",
              tag: payload.tag || `msg-${Date.now()}`,
              data: payload.data || {},
            },
          });

          // Enviar push usando web-push
          // NOTA: Para produção, você precisará usar a biblioteca web-push
          // ou implementar o protocolo VAPID manualmente
          // Por enquanto, vamos apenas logar
          console.log(`Sending push to ${subscription.endpoint}`);
          console.log(`Payload: ${notificationPayload}`);

          // TODO: Implementar envio real com web-push
          // await webpush.sendNotification(
          //   {
          //     endpoint: subscription.endpoint,
          //     keys: {
          //       p256dh: subscription.p256dh,
          //       auth: subscription.auth,
          //     },
          //   },
          //   notificationPayload
          // );

          return { success: true, endpoint: subscription.endpoint };
        } catch (error) {
          console.error(`Failed to send to ${subscription.endpoint}:`, error);
          
          // Se o endpoint não é mais válido, remover da base
          if (error instanceof Error && error.message.includes("410")) {
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
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
