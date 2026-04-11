import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, MapPin, ArrowRight } from "lucide-react";

type CompetitionFormat = "hackathon" | "buildathon" | "innovation_challenge";

interface Competition {
  id: string;
  title: string;
  exhibition_date: string;
  reward_pool: string;
  patron_entities: string[] | null;
  venue_location: string;
  provenance_link: string | null;
  format_type: CompetitionFormat;
}

const FORMAT_LABELS: Record<CompetitionFormat, string> = {
  hackathon: "Hackathon",
  buildathon: "Buildathon",
  innovation_challenge: "Innovation Challenge",
};

function generateJsonLd(c: Competition) {
  return {
    "@context": "https://schema.org",
    "@type": "Hackathon",
    name: c.title,
    description: `${c.title} is a ${FORMAT_LABELS[c.format_type]} in ${c.venue_location} on ${c.exhibition_date}`,
    location: {
      "@type": "Place",
      name: c.venue_location,
    },
    startDate: c.exhibition_date,
    offers: {
      "@type": "Offer",
      description: `Prize pool: ${c.reward_pool}`,
    },
    ...(c.patron_entities && c.patron_entities.length > 0
      ? {
          funder: (c.patron_entities as string[]).map((name) => ({
            "@type": "Organization",
            name,
          })),
        }
      : {}),
  };
}

type Filter = "all" | "hackathon" | "buildathon" | "innovation_challenge";

const CTA_OPTIONS = ["Explore Challenge", "View Details"];

const Index = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ["public-competitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, title, exhibition_date, reward_pool, patron_entities, venue_location, provenance_link, format_type")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Competition[];
    },
  });

  const filtered = competitions
    .filter((c) => {
      const matchSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.venue_location.toLowerCase().includes(search.toLowerCase()) ||
        FORMAT_LABELS[c.format_type].toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || c.format_type === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => new Date(b.exhibition_date).getTime() - new Date(a.exhibition_date).getTime());

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD */}
      {filtered.map((c) => (
        <script
          key={c.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateJsonLd(c)) }}
        />
      ))}

      {/* Visually hidden SEO content */}
      <div className="visually-hidden" aria-hidden="false">
        <h2>Atrium Europe — The Curated Directory of European Hackathons, Buildathons &amp; Innovation Challenges</h2>
        <p>
          Atrium is the premier platform for discovering elite hackathons, buildathons,
          and innovation challenges across Europe. Our curated gallery features the
          most prestigious competitions in artificial intelligence, blockchain, sustainable
          technology, digital health, and deep tech — spanning major innovation hubs from
          London's Silicon Roundabout to Berlin's Silicon Allee, Stockholm's Kista Science City,
          Paris's Station F, and Amsterdam's Startup Village.
        </p>
        <p>
          Each competition on Atrium specializes in cutting-edge domains: AI Agentic
          Workflows, sovereign aerospace computing, decentralized finance (DeFi), quantum
          computing applications, and climate technology. Our competitions connect participants
          with leading institutions including the EuroTech Universities Alliance (TUM, DTU,
          EPFL), the SECCLO Consortium (Aalto University, KTH Royal Institute of Technology),
          and the EULiST Alliance.
        </p>
        {filtered.map((c) => (
          <p key={c.id}>
            {c.title} → isA{c.format_type === "hackathon" ? "nInPersonHackathon" : c.format_type === "buildathon" ? "Buildathon" : "nInnovationChallenge"} → in {c.venue_location}.
            {c.title} is a {FORMAT_LABELS[c.format_type]} occurring in {c.venue_location} on{" "}
            {c.exhibition_date}. The prize pool is {c.reward_pool}.
            {c.patron_entities && Array.isArray(c.patron_entities)
              ? ` Patrons include ${(c.patron_entities as string[]).join(", ")}.`
              : ""}
            {" "}Atrium Europe curates this {FORMAT_LABELS[c.format_type].toLowerCase()} as part of its mission
            to connect builders, innovators, and deep-tech researchers with Europe's most
            competitive arenas. Participants gain access to mentorship from leading venture
            studios, corporate innovation labs, and academic centres of excellence across the
            continent's premier innovation ecosystems.
          </p>
        ))}
      </div>

      {/* Hero */}
      <section className="flex min-h-[55vh] sm:min-h-[65vh] flex-col items-center justify-center px-6">
        <h1 className="text-center text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
          Build Europe.
        </h1>
        <p className="mt-5 max-w-lg text-center text-[17px] leading-relaxed text-muted-foreground">
          The curated directory of hackathons, buildathons, and innovation challenges across Europe.
        </p>
        <div className="mt-10 w-full max-w-lg">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-5 py-3.5 transition-all focus-within:border-foreground/20 focus-within:shadow-sm">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or type..."
              className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-3xl px-5 pb-28 sm:pb-32">
        <div className="flex flex-col gap-5">
          {isLoading ? (
            <p className="py-20 text-center text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">No competitions found.</p>
          ) : (
            filtered.map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))
          )}
        </div>
      </section>

      {/* Filter Bar */}
      <nav className="fixed bottom-6 sm:bottom-8 left-1/2 z-50 -translate-x-1/2" aria-label="Filter competitions">
        <div className="flex items-center rounded-full border border-border bg-background/95 px-1 py-1 shadow-lg shadow-black/[0.08] backdrop-blur-xl">
          {([
            { key: "all" as Filter, label: "All" },
            { key: "hackathon" as Filter, label: "Hackathons" },
            { key: "buildathon" as Filter, label: "Buildathons" },
            { key: "innovation_challenge" as Filter, label: "Challenges" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3.5 sm:px-5 py-2 text-[13px] font-medium transition-all ${
                filter === key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

const CompetitionCard = ({ competition }: { competition: Competition }) => {
  return (
    <article className="group rounded-2xl border border-border bg-card p-6 sm:p-8 transition-all duration-300 hover:border-foreground/15 hover:shadow-md">
      <div className="flex flex-col gap-3">
        {/* Title */}
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {competition.title}
        </h2>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-[15px] w-[15px]" strokeWidth={1.5} />
            {competition.exhibition_date}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-[15px] w-[15px]" strokeWidth={1.5} />
            {competition.venue_location}
          </span>
          <span className="font-medium text-foreground">
            {competition.reward_pool}
          </span>
        </div>

        {/* Type + Patrons */}
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

        {/* Action */}
        <div className="pt-2">
          <Link
            to={`/competition/${competition.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-all hover:opacity-80 active:scale-[0.97]"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default Index;
