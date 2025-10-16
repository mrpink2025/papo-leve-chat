// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Edge Function para limpar chamadas em grupo (timeout e cooldown)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[cleanup-group-calls] Iniciando limpeza...');

    // 1. Marcar participantes como TIMEOUT (RINGING há >60s)
    const timeoutThreshold = new Date(Date.now() - 60000).toISOString();
    
    const { data: timedOutParticipants, error: timeoutError } = await supabase
      .from('group_call_participants')
      .update({ status: 'TIMEOUT' })
      .eq('status', 'RINGING')
      .lt('created_at', timeoutThreshold)
      .select('id, session_id, user_id');

    if (timeoutError) {
      console.error('[cleanup-group-calls] Erro ao marcar timeouts:', timeoutError);
    } else {
      console.log(`[cleanup-group-calls] ✅ ${timedOutParticipants?.length || 0} participantes marcados como TIMEOUT`);
    }

    // 2. Encerrar chamadas em COOLDOWN há >60s
    const cooldownThreshold = new Date(Date.now() - 60000).toISOString();
    
    const { data: cooldownSessions, error: cooldownError } = await supabase
      .from('group_call_sessions')
      .select('id')
      .eq('state', 'COOLDOWN')
      .lt('updated_at', cooldownThreshold);

    if (cooldownError) {
      console.error('[cleanup-group-calls] Erro ao buscar sessões em cooldown:', cooldownError);
    } else if (cooldownSessions && cooldownSessions.length > 0) {
      const sessionIds = cooldownSessions.map(s => s.id);
      
      const { error: endError } = await supabase
        .from('group_call_sessions')
        .update({ 
          state: 'ENDED', 
          ended_at: new Date().toISOString() 
        })
        .in('id', sessionIds);

      if (endError) {
        console.error('[cleanup-group-calls] Erro ao encerrar sessões:', endError);
      } else {
        console.log(`[cleanup-group-calls] ✅ ${sessionIds.length} sessões encerradas (COOLDOWN → ENDED)`);
      }
    } else {
      console.log('[cleanup-group-calls] Nenhuma sessão em cooldown para encerrar');
    }

    // 3. Limpar sessões ENDED antigas (>7 dias)
    const oldSessionsThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedSessions, error: deleteError } = await supabase
      .from('group_call_sessions')
      .delete()
      .eq('state', 'ENDED')
      .lt('ended_at', oldSessionsThreshold)
      .select('id');

    if (deleteError) {
      console.error('[cleanup-group-calls] Erro ao deletar sessões antigas:', deleteError);
    } else {
      console.log(`[cleanup-group-calls] ✅ ${deletedSessions?.length || 0} sessões antigas removidas`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timedOut: timedOutParticipants?.length || 0,
        ended: cooldownSessions?.length || 0,
        deleted: deletedSessions?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[cleanup-group-calls] Erro fatal:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
