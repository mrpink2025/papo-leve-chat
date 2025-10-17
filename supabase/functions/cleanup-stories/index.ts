import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Iniciando limpeza de stories expirados...');

    // Buscar stories expirados há mais de 7 dias
    const { data: expiredStories, error: fetchError } = await supabase
      .from('stories')
      .select('id, media_url, thumbnail_url, user_id')
      .lt('expires_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error('❌ Erro ao buscar stories expirados:', fetchError);
      throw fetchError;
    }

    if (!expiredStories || expiredStories.length === 0) {
      console.log('✅ Nenhum story expirado para limpar');
      return new Response(
        JSON.stringify({ message: 'Nenhum story expirado', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Encontrados ${expiredStories.length} stories expirados`);

    // Deletar arquivos do storage
    const filesToDelete: string[] = [];
    for (const story of expiredStories) {
      if (story.media_url) {
        // Extrair path do URL do storage
        const url = new URL(story.media_url);
        const pathMatch = url.pathname.match(/\/stories\/(.+)$/);
        if (pathMatch) {
          filesToDelete.push(pathMatch[1]);
        }
      }
      if (story.thumbnail_url) {
        const url = new URL(story.thumbnail_url);
        const pathMatch = url.pathname.match(/\/stories\/(.+)$/);
        if (pathMatch) {
          filesToDelete.push(pathMatch[1]);
        }
      }
    }

    if (filesToDelete.length > 0) {
      console.log(`🗑️ Deletando ${filesToDelete.length} arquivos do storage...`);
      const { error: storageError } = await supabase.storage
        .from('stories')
        .remove(filesToDelete);

      if (storageError) {
        console.error('⚠️ Erro ao deletar arquivos (continuando):', storageError);
      } else {
        console.log('✅ Arquivos deletados com sucesso');
      }
    }

    // Deletar registros do banco de dados
    const storyIds = expiredStories.map(s => s.id);
    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .in('id', storyIds);

    if (deleteError) {
      console.error('❌ Erro ao deletar stories:', deleteError);
      throw deleteError;
    }

    console.log(`✅ ${storyIds.length} stories deletados com sucesso`);

    // Limpar visualizações e reações órfãs
    const { error: cleanupError } = await supabase.rpc('cleanup_expired_stories');
    if (cleanupError) {
      console.error('⚠️ Erro na limpeza adicional:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Limpeza concluída',
        deletedStories: storyIds.length,
        deletedFiles: filesToDelete.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro na limpeza:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});