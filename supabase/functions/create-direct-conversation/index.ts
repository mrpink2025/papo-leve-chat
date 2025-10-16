// Signed by Lovable — Create direct conversation atomically
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: meData, error: meError } = await admin.auth.getUser(accessToken);
    if (meError || !meData?.user) {
      console.error("[create-direct-conversation] getUser error:", meError);
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const me = meData.user;
    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target_user_id === me.id) {
      return new Response(JSON.stringify({ error: "Cannot create conversation with yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Find an existing direct conversation with both participants
    const { data: cpRows, error: cpError } = await admin
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("user_id", [me.id, target_user_id]);

    if (cpError) {
      console.error("[create-direct-conversation] Fetch participants error:", cpError);
      return new Response(JSON.stringify({ error: cpError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let directConversationId: string | null = null;
    if (cpRows && cpRows.length) {
      const byConv: Record<string, Set<string>> = {};
      for (const row of cpRows) {
        if (!byConv[row.conversation_id]) byConv[row.conversation_id] = new Set();
        byConv[row.conversation_id].add(row.user_id);
      }
      const bothIds = Object.entries(byConv)
        .filter(([, set]) => set.has(me.id) && set.has(target_user_id))
        .map(([convId]) => convId);

      if (bothIds.length) {
        const { data: existing, error: existingErr } = await admin
          .from("conversations")
          .select("id")
          .in("id", bothIds)
          .eq("type", "direct")
          .limit(1)
          .maybeSingle();

        if (existingErr) {
          console.error("[create-direct-conversation] Check existing error:", existingErr);
        }
        if (existing?.id) {
          directConversationId = existing.id;
        }
      }
    }

    if (directConversationId) {
      return new Response(JSON.stringify({ id: directConversationId, reused: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Create new conversation and participants
    const newId = crypto.randomUUID();

    const { error: convInsertError } = await admin.from("conversations").insert({
      id: newId,
      type: "direct",
      created_by: me.id,
    });

    if (convInsertError) {
      console.error("[create-direct-conversation] Insert conversation error:", convInsertError);
      return new Response(JSON.stringify({ error: convInsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: partsError } = await admin.from("conversation_participants").insert([
      { conversation_id: newId, user_id: me.id },
      { conversation_id: newId, user_id: target_user_id },
    ]);

    if (partsError) {
      console.error("[create-direct-conversation] Insert participants error:", partsError);
      // Best effort cleanup
      await admin.from("conversations").delete().eq("id", newId);
      return new Response(JSON.stringify({ error: partsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: newId, reused: false }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-direct-conversation] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});