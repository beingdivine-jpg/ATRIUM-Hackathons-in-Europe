import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-atrium-handshake",
};

const LANG_MAP: Record<string, { column: string; name: string }> = {
  fr: { column: "editorial_summary_fr", name: "French" },
  de: { column: "editorial_summary_de", name: "German" },
  es: { column: "editorial_summary_es", name: "Spanish" },
};

function getSystemPrompt(langName: string) {
  return `You are a high-end editorial translator for Atrium Europe. Translate the following editorial summary into ${langName}. Maintain the sophisticated, minimal, and inspiring tone. Return only the translated text with no headings, labels, or explanations.`;
}

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
    const { competition_id, editorial_summary, venue_location } = await req.json();

    if (!competition_id || !editorial_summary) {
      return new Response(
        JSON.stringify({ error: "competition_id and editorial_summary are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which languages to translate based on venue location
    const loc = (venue_location || "").toLowerCase();
    const targetLangs: string[] = [];
    
    if (loc.includes("france") || loc.includes("paris") || loc.includes("lyon") || loc.includes("marseille") || loc.includes("switzerland") || loc.includes("zurich") || loc.includes("geneva") || loc.includes("brussels") || loc.includes("belgium")) {
      targetLangs.push("fr");
    }
    if (loc.includes("germany") || loc.includes("berlin") || loc.includes("munich") || loc.includes("hamburg") || loc.includes("frankfurt") || loc.includes("austria") || loc.includes("vienna") || loc.includes("switzerland") || loc.includes("zurich")) {
      targetLangs.push("de");
    }
    if (loc.includes("spain") || loc.includes("madrid") || loc.includes("barcelona") || loc.includes("lisbon") || loc.includes("portugal")) {
      targetLangs.push("es");
    }

    // If no regional match, translate to all three
    if (targetLangs.length === 0) {
      targetLangs.push("fr", "de", "es");
    }

    // Deduplicate
    const uniqueLangs = [...new Set(targetLangs)];

    const translations: Record<string, string> = {};

    for (const lang of uniqueLangs) {
      const langInfo = LANG_MAP[lang];
      
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
              { role: "system", content: getSystemPrompt(langInfo.name) },
              { role: "user", content: editorial_summary },
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
        console.error(`Translation to ${lang} failed:`, status);
        continue;
      }

      const aiData = await aiResponse.json();
      const translated = aiData.choices?.[0]?.message?.content?.trim() || "";
      if (translated) {
        translations[langInfo.column] = translated;
      }
    }

    if (Object.keys(translations).length === 0) {
      throw new Error("All translations failed");
    }

    // Save to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabaseAdmin
      .from("competitions")
      .update(translations)
      .eq("id", competition_id);

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        competition_id,
        translated_languages: uniqueLangs,
        translations,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
