// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
// Edge function para limpar tokens de push inativos
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
    console.log('[CleanupTokens] 🧹 Iniciando limpeza de tokens inativos');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Remover tokens não usados há mais de 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inactiveTokens, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, device_name, last_used_at, created_at')
      .lt('last_used_at', thirtyDaysAgo);

    if (fetchError) {
      console.error('[CleanupTokens] ❌ Erro ao buscar tokens:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!inactiveTokens || inactiveTokens.length === 0) {
      console.log('[CleanupTokens] ✅ Nenhum token inativo encontrado');
      return new Response(
        JSON.stringify({ success: true, cleaned: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CleanupTokens] 🗑️ ${inactiveTokens.length} tokens inativos encontrados`);

    // Remover tokens inativos
    const tokenIds = inactiveTokens.map(t => t.id);
    
    const { error: deleteError, count } = await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', tokenIds);

    if (deleteError) {
      console.error('[CleanupTokens] ❌ Erro ao deletar tokens:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Registrar no analytics
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'cleanup_tokens',
        event_data: {
          tokens_removed: inactiveTokens.length,
          threshold_days: 30,
        },
      });

    console.log(`[CleanupTokens] ✅ ${count} tokens removidos com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleaned: count,
        tokens: inactiveTokens.map(t => ({
          device: t.device_name,
          lastUsed: t.last_used_at,
        }))
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[CleanupTokens] ❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
