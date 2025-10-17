import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('[get-media-url] Erro de autenticação:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { messageId, bucket } = await req.json();

    if (!messageId || !bucket) {
      return new Response(
        JSON.stringify({ error: 'messageId e bucket são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[get-media-url] Solicitação de URL para mensagem ${messageId} no bucket ${bucket}`);

    // Buscar mensagem e verificar permissões
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .select('id, conversation_id, created_at, metadata, sender_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('[get-media-url] Mensagem não encontrada:', messageError);
      return new Response(
        JSON.stringify({ error: 'Mensagem não encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar conversa
    const { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select('type')
      .eq('id', message.conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('[get-media-url] Conversa não encontrada:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversa não encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Se for grupo, verificar joined_at
    if (conversation.type === 'group') {
      const { data: participant, error: participantError } = await supabaseClient
        .from('conversation_participants')
        .select('joined_at, joined_at_history')
        .eq('conversation_id', message.conversation_id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      if (participantError || !participant) {
        console.log('[get-media-url] Usuário não é participante do grupo');
        return new Response(
          JSON.stringify({ error: 'Acesso negado: não é membro do grupo' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Usar joined_at_history se disponível, senão joined_at
      const joinedAt = new Date(participant.joined_at_history || participant.joined_at);
      const messageCreatedAt = new Date(message.created_at);

      if (messageCreatedAt < joinedAt) {
        console.log('[get-media-url] Mensagem anterior ao joined_at do usuário');
        return new Response(
          JSON.stringify({ error: 'Acesso negado: mensagem anterior à sua entrada no grupo' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // Para conversas diretas, verificar se é participante
      const { data: participant, error: participantError } = await supabaseClient
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', message.conversation_id)
        .eq('user_id', user.id)
        .single();

      if (participantError || !participant) {
        console.log('[get-media-url] Usuário não é participante da conversa');
        return new Response(
          JSON.stringify({ error: 'Acesso negado: não é participante da conversa' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Extrair path do arquivo da metadata
    const filePath = message.metadata?.url;
    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'Arquivo não encontrado na mensagem' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extrair apenas o path do storage (remover a parte da URL do Supabase)
    let storagePath = filePath;
    if (filePath.includes('/storage/v1/object/')) {
      const pathMatch = filePath.match(/\/storage\/v1\/object\/[^/]+\/[^/]+\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        storagePath = pathMatch[1];
      }
    } else if (filePath.includes('/sign/')) {
      const pathMatch = filePath.match(/\/sign\/[^/]+\/(.+)\?/);
      if (pathMatch && pathMatch[1]) {
        storagePath = pathMatch[1];
      }
    }

    console.log(`[get-media-url] Gerando URL assinada para: ${storagePath}`);

    // Gerar URL assinada com TTL de 10 minutos
    const { data: signedData, error: signError } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(storagePath, 600); // 10 minutos

    if (signError || !signedData) {
      console.error('[get-media-url] Erro ao gerar URL assinada:', signError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar URL de acesso' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[get-media-url] URL gerada com sucesso');

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, expiresIn: 600 }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[get-media-url] Erro não tratado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
