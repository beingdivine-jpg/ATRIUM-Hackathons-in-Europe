import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { title, exhibition_date, reward_pool, patron_entities, venue_location, provenance_link } = await req.json();

    if (!title || !exhibition_date || !reward_pool || !venue_location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, exhibition_date, reward_pool, venue_location" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin
      .from("technical_exhibitions")
      .insert({
        title: String(title).trim(),
        exhibition_date: String(exhibition_date).trim(),
        reward_pool: String(reward_pool).trim(),
        patron_entities: Array.isArray(patron_entities) ? patron_entities : [],
        venue_location: String(venue_location).trim(),
        provenance_link: provenance_link ? String(provenance_link).trim() : null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, exhibition: data }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
