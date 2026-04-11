import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight } from "lucide-react";

export type CompetitionFormat = "hackathon" | "buildathon" | "innovation_challenge";

export interface Competition {
  id: string;
  title: string;
  slug: string;
  exhibition_date: string;
  reward_pool: string;
  patron_entities: string[] | null;
  venue_location: string;
  provenance_link: string | null;
  format_type: CompetitionFormat;
  is_remote: boolean | null;
  organizer: string | null;
  editorial_summary: string | null;
}

export const FORMAT_LABELS: Record<CompetitionFormat, string> = {
  hackathon: "Hackathon",
  buildathon: "Buildathon",
  innovation_challenge: "Innovation Challenge",
};

export const CompetitionCard = ({ competition }: { competition: Competition }) => {
  return (
    <article className="group rounded-[2rem] border border-border bg-card p-6 sm:p-8 transition-all duration-500 hover:border-foreground/20 hover:scale-[1.01]">
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {competition.title}
        </h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-[15px] w-[15px]" strokeWidth={1.5} aria-label="Date" />
            {competition.exhibition_date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-[15px] w-[15px]" strokeWidth={1.5} aria-label="Location" />
            {competition.venue_location}
          </span>
          <span className="font-medium text-foreground">
            {competition.reward_pool}
          </span>
        </div>

        {competition.editorial_summary && (
          <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-3">
            {competition.editorial_summary}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
            {FORMAT_LABELS[competition.format_type]}
          </span>
          {competition.patron_entities && Array.isArray(competition.patron_entities) && (
            (competition.patron_entities as string[]).map((patron, i) => (
              <span key={i} className="text-[12px] text-muted-foreground/50">
                {patron}
              </span>
            ))
          )}
        </div>

        <div className="pt-2">
          <Link
            to={`/competition/${competition.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-80 active:scale-[0.97]"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-label="Go to details" />
          </Link>
        </div>
      </div>
    </article>
  );
};
