import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GalleryWing } from "@/components/GalleryWing";
import type { Competition } from "@/components/CompetitionCard";

const CityWing = () => {
  const { city } = useParams<{ city: string }>();
  const displayCity = city
    ? city.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "";

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ["wing-city", city],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 7);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("competitions")
        .select("id, title, slug, exhibition_date, reward_pool, patron_entities, venue_location, provenance_link, format_type, is_remote, organizer, editorial_summary")
        .eq("status", "published")
        .ilike("venue_location", `%${displayCity}%`)
        .gt("exhibition_date", cutoffStr)
        .order("exhibition_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Competition[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!city,
  });

  const curatorial = `A focused survey of innovation challenges taking place in and around ${displayCity}. From established institutions to emerging collectives, this wing maps the competitive landscape of one of Europe's most dynamic hubs.`;

  return (
    <GalleryWing
      title={displayCity}
      curatorial={curatorial}
      pageTitle={`${displayCity} — Hackathons & Challenges | Atrium Europe`}
      metaDescription={`Discover hackathons, buildathons, and innovation challenges in ${displayCity}. ${curatorial}`}
      canonicalPath={`/city/${city}`}
      competitions={competitions}
      isLoading={isLoading}
    />
  );
};

export default CityWing;
