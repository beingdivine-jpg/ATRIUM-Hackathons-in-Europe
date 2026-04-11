import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GalleryWing } from "@/components/GalleryWing";
import type { Competition, CompetitionFormat } from "@/components/CompetitionCard";
import { FORMAT_LABELS } from "@/components/CompetitionCard";

const CATEGORY_META: Record<string, { title: string; curatorial: string }> = {
  hackathon: {
    title: "The Hackathon Wing",
    curatorial:
      "The crucible of rapid innovation. These time-bound, high-pressure arenas forge ideas into functional prototypes — testing not just code, but conviction. Enter the wing where Europe's boldest builders compete.",
  },
  buildathon: {
    title: "The Buildathon Wing",
    curatorial:
      "Where sustained creation replaces sprint culture. Buildathons reward depth over speed, inviting teams to architect solutions with lasting structural integrity. This wing celebrates the patient craft of building.",
  },
  innovation_challenge: {
    title: "The Innovation Wing",
    curatorial:
      "Corporate and institutional challenges seeking breakthrough thinking. These curated programmes connect visionary organisations with the continent's sharpest minds to solve problems that matter.",
  },
};

const CategoryWing = () => {
  const { category } = useParams<{ category: string }>();
  const format = category as CompetitionFormat;
  const meta = CATEGORY_META[format];

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ["wing-category", format],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 7);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("competitions")
        .select("id, title, slug, exhibition_date, reward_pool, patron_entities, venue_location, provenance_link, format_type, is_remote, organizer, editorial_summary")
        .eq("status", "published")
        .eq("format_type", format)
        .gt("exhibition_date", cutoffStr)
        .order("exhibition_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Competition[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!meta,
  });

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Wing not found.</p>
      </div>
    );
  }

  return (
    <GalleryWing
      title={meta.title}
      curatorial={meta.curatorial}
      pageTitle={`${meta.title} — Atrium Europe`}
      metaDescription={meta.curatorial}
      canonicalPath={`/wing/${format}`}
      competitions={competitions}
      isLoading={isLoading}
    />
  );
};

export default CategoryWing;
