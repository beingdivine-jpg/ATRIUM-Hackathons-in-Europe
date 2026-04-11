import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight, Trophy } from "lucide-react";

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
    <article className="group relative rounded-[2rem] border border-[#F1F1F4] bg-white p-6 sm:p-8 shadow-xl shadow-zinc-200/50 transition-all duration-500 hover:shadow-2xl hover:shadow-zinc-300/40 hover:scale-[1.008]">
      {/* Subtle grey-to-transparent gradient wash for depth */}
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-zinc-50/60 via-transparent to-zinc-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-[#111111] sm:text-2xl">
          {competition.title}
        </h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-[#52525B]">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-[15px] w-[15px] text-[#52525B]" strokeWidth={1.4} aria-label="Date" />
            {competition.exhibition_date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-[15px] w-[15px] text-[#52525B]" strokeWidth={1.4} aria-label="Location" />
            {competition.venue_location}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-[#111111]">
            <Sparkles className="h-[13px] w-[13px] text-[#111111]" strokeWidth={1.4} aria-label="Prize" />
            {competition.reward_pool}
          </span>
        </div>

        {competition.editorial_summary && (
          <p className="text-[13px] leading-relaxed text-[#52525B]/80 line-clamp-3">
            {competition.editorial_summary}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="rounded-full border border-[#E4E4E7] bg-[#F9F9FB] px-3 py-1 text-[12px] font-medium text-[#52525B]">
            {FORMAT_LABELS[competition.format_type]}
          </span>
          {competition.patron_entities && Array.isArray(competition.patron_entities) && (
            (competition.patron_entities as string[]).map((patron, i) => (
              <span key={i} className="text-[12px] text-[#52525B]/40 italic">
                {patron}
              </span>
            ))
          )}
        </div>

        <div className="pt-2">
          <Link
            to={`/competition/${competition.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[#000000] active:scale-[0.97] shadow-sm shadow-zinc-400/20"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-label="Go to details" />
          </Link>
        </div>
      </div>
    </article>
  );
};
