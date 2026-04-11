import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-atrium-handshake",
};

const SYSTEM_PROMPT = `You are a high-end editorial curator for Atrium Europe. Take this raw hackathon data and synthesize it into a 150-word "Museum Plaque" summary. Focus on the visionary potential of the event, its technological significance (e.g., Agentic AI, Zero-Knowledge), and the prestige of the venue. Maintain a tone that is sophisticated, minimal, and inspiring. Avoid marketing fluff and jargon-heavy bullet points. Return only the summary text with no headings or labels.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { competition_id, title, description, venue_location, format_type, reward_pool, tags } =
      await req.json();

    if (!competition_id || !title) {
      return new Response(
        JSON.stringify({ error: "competition_id and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Title: ${title}
Location: ${venue_location || "Unknown"}
Format: ${format_type || "hackathon"}
Prize Pool: ${reward_pool || "Not specified"}
Tags: ${tags?.join(", ") || "None"}
Raw Description: ${description || "No description available."}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited — please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted — add funds in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    const editorialSummary =
      aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!editorialSummary) {
      throw new Error("AI returned empty summary");
    }

    // Save to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabaseAdmin
      .from("competitions")
      .update({ editorial_summary: editorialSummary })
      .eq("id", competition_id);

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        competition_id,
        editorial_summary: editorialSummary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("synthesize-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
