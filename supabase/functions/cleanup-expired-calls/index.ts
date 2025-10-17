// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Edge function para limpar chamadas expiradas (timeout 30s)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('[CleanupCalls] 🧹 Iniciando limpeza de chamadas expiradas');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar chamadas "ringing" com mais de 30 segundos
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data: expiredCalls, error: fetchError } = await supabase
      .from('call_notifications')
      .select('id, user_id, caller_id, conversation_id')
      .eq('status', 'ringing')
      .lt('started_at', thirtySecondsAgo);

    if (fetchError) {
      console.error('[CleanupCalls] ❌ Erro ao buscar chamadas:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredCalls || expiredCalls.length === 0) {
      console.log('[CleanupCalls] ✅ Nenhuma chamada expirada encontrada');
      return new Response(
        JSON.stringify({ success: true, cleaned: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CleanupCalls] 📞 ${expiredCalls.length} chamadas expiradas encontradas`);

    // Atualizar status para "missed"
    const callIds = expiredCalls.map(c => c.id);
    
    const { error: updateError } = await supabase
      .from('call_notifications')
      .update({
        status: 'missed',
        ended_at: new Date().toISOString(),
      })
      .in('id', callIds);

    if (updateError) {
      console.error('[CleanupCalls] ❌ Erro ao atualizar chamadas:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enviar mensagem de sistema informando chamada perdida
    for (const call of expiredCalls) {
      try {
        // Buscar nome do caller
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', call.caller_id)
          .single();

        const callerName = callerProfile?.full_name || callerProfile?.username || 'Alguém';

        // Inserir mensagem de sistema
        await supabase
          .from('messages')
          .insert({
            conversation_id: call.conversation_id,
            sender_id: call.caller_id,
            content: `📞 Chamada perdida de ${callerName}`,
            type: 'text',
            metadata: { 
              isSystemMessage: true,
              isMissedCall: true,
              callId: call.id,
            },
          });

        console.log(`[CleanupCalls] ✅ Mensagem de chamada perdida criada para ${call.id}`);
      } catch (error) {
        console.error(`[CleanupCalls] ⚠️ Erro ao criar mensagem de sistema:`, error);
      }
    }

    // Enviar notificações silenciosas para fechar as notificações push
    for (const call of expiredCalls) {
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            recipientId: call.user_id,
            payload: {
              title: 'Call ended',
              body: 'Call ended',
              tag: `call:${call.id}`,
              silent: true,
              requireInteraction: false,
              data: {
                action: 'cancel-call',
                callId: call.id,
                category: 'call',
              },
            },
            category: 'call-cancel',
            callId: call.id,
          },
        });

        console.log(`[CleanupCalls] 🔕 Notificação de cancelamento enviada para ${call.id}`);
      } catch (error) {
        console.error(`[CleanupCalls] ⚠️ Erro ao enviar notificação de cancelamento:`, error);
      }
    }

    console.log(`[CleanupCalls] ✅ ${expiredCalls.length} chamadas limpas com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleaned: expiredCalls.length,
        callIds 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[CleanupCalls] ❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
