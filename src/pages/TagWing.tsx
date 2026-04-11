import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GalleryWing } from "@/components/GalleryWing";
import type { Competition } from "@/components/CompetitionCard";
import { TAG_WINGS } from "@/lib/wings";

const TagWing = () => {
  const { tag } = useParams<{ tag: string }>();
  const displayTag = tag
    ? tag.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "";

  const wingMeta = tag ? TAG_WINGS[tag] : undefined;
  const title = wingMeta?.title || `The ${displayTag} Wing`;
  const curatorial =
    wingMeta?.curatorial ||
    `A focused collection of hackathons, buildathons, and innovation challenges centred on ${displayTag}. This wing brings together Europe's most ambitious competitions in the ${displayTag} domain.`;

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ["wing-tag", tag],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 7);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("competitions")
        .select(
          "id, title, slug, exhibition_date, reward_pool, patron_entities, venue_location, provenance_link, format_type, is_remote, organizer, editorial_summary, tags"
        )
        .eq("status", "published")
        .gt("exhibition_date", cutoffStr)
        .contains("tags", [displayTag])
        .order("exhibition_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Competition[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tag,
  });

  return (
    <GalleryWing
      title={title}
      curatorial={curatorial}
      pageTitle={`${title} — Atrium Europe`}
      metaDescription={curatorial.slice(0, 160)}
      canonicalPath={`/topic/${tag}`}
      competitions={competitions}
      isLoading={isLoading}
    />
  );
};

export default TagWing;
