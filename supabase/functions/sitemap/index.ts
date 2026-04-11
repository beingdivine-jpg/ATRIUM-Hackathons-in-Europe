import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: competitions, error } = await supabaseAdmin
      .from("competitions")
      .select("slug, exhibition_date, end_date, updated_at, status, series_slug, is_recurring, format_type, venue_location, tags")
      .in("status", ["published", "archived"])
      .order("exhibition_date", { ascending: false });

    if (error) throw error;

    const now = new Date();

    // Collect unique wing pages
    const cities = new Set<string>();
    const formats = new Set<string>();
    const tags = new Set<string>();

    let urls = (competitions || []).map((c: any) => {
      const refDate = c.end_date || c.exhibition_date;
      const isUpcoming = refDate ? new Date(refDate) >= now : false;
      const priority = isUpcoming ? "0.9" : "0.4";
      const changefreq = isUpcoming ? "weekly" : "yearly";

      // Collect wings
      const city = (c.venue_location || "").split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
      if (city) cities.add(city);
      if (c.format_type) formats.add(c.format_type);
      if (c.tags) c.tags.forEach((t: string) => tags.add(t.toLowerCase().replace(/\s+/g, "-")));

      return `  <url>
    <loc>https://atrium.eu/competition/${c.slug}</loc>
    <lastmod>${c.updated_at ? new Date(c.updated_at).toISOString().slice(0, 10) : now.toISOString().slice(0, 10)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    // Add wing pages
    for (const fmt of formats) {
      urls.push(`  <url>
    <loc>https://atrium.eu/wing/${fmt}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    for (const city of cities) {
      urls.push(`  <url>
    <loc>https://atrium.eu/city/${city}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    for (const tag of tags) {
      urls.push(`  <url>
    <loc>https://atrium.eu/topic/${tag}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    // Series URLs
    const seriesSlugs = new Set<string>();
    (competitions || []).forEach((c: any) => {
      if (c.series_slug && c.is_recurring) seriesSlugs.add(c.series_slug);
    });
    for (const ss of seriesSlugs) {
      urls.push(`  <url>
    <loc>https://atrium.eu/series/${ss}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://atrium.eu/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls.join("\n")}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("sitemap error:", e);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { status: 500, headers: { "Content-Type": "application/xml" } }
    );
  }
});
