import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-atrium-handshake",
};

const VALID_FORMATS = ["hackathon", "buildathon", "innovation_challenge"];

interface IncomingCompetition {
  title: string;
  exhibition_date: string;
  reward_pool: string;
  patron_entities?: string[];
  venue_location: string;
  provenance_link: string;
  format_type?: string;
  source_signal?: string;
  is_remote?: boolean;
}

function parsePrizeAmount(pool: string): number {
  const cleaned = pool.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

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

  // Verify handshake token
  const handshake = req.headers.get("x-atrium-handshake");
  const expectedSecret = Deno.env.get("HARVESTER_SECRET");

  if (!expectedSecret || handshake !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — invalid handshake token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const items: IncomingCompetition[] = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Empty payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    for (const item of items) {
      if (!item.title || !item.exhibition_date || !item.reward_pool || !item.venue_location || !item.provenance_link) {
        return new Response(
          JSON.stringify({ error: "Each item requires: title, exhibition_date, reward_pool, venue_location, provenance_link" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch existing provenance_links for dedup
    const links = items.map((i) => i.provenance_link.trim());
    const { data: existing } = await supabaseAdmin
      .from("competitions")
      .select("provenance_link")
      .in("provenance_link", links);

    const existingLinks = new Set((existing ?? []).map((r: { provenance_link: string }) => r.provenance_link));

    const newItems = items.filter((i) => !existingLinks.has(i.provenance_link.trim()));

    if (newItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, inserted: 0, duplicates: items.length, message: "All items already exist" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = newItems.map((item) => {
      const format = VALID_FORMATS.includes(item.format_type ?? "") ? item.format_type! : "hackathon";
      const isRemote = item.is_remote === true;
      const prize = parsePrizeAmount(item.reward_pool);

      // Prestige filter: remote + <€30k → auto-archive
      const status = isRemote && prize < 30000 ? "archived" : "pending";

      return {
        title: String(item.title).trim(),
        exhibition_date: String(item.exhibition_date).trim(),
        reward_pool: String(item.reward_pool).trim(),
        patron_entities: Array.isArray(item.patron_entities) ? item.patron_entities : [],
        venue_location: String(item.venue_location).trim(),
        provenance_link: String(item.provenance_link).trim(),
        format_type: format,
        source_signal: item.source_signal ? String(item.source_signal).trim() : "unknown",
        is_remote: isRemote,
        status,
      };
    });

    const { data, error } = await supabaseAdmin
      .from("competitions")
      .insert(rows)
      .select();

    if (error) throw error;

    const archivedCount = rows.filter((r) => r.status === "archived").length;
    const pendingCount = rows.filter((r) => r.status === "pending").length;

    return new Response(
      JSON.stringify({
        success: true,
        inserted: data.length,
        pending: pendingCount,
        auto_archived: archivedCount,
        duplicates: items.length - newItems.length,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
