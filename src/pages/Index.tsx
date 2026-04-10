import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, MapPin, Trophy, ArrowRight, ExternalLink, Zap } from "lucide-react";

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

  const filtered = competitions.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.venue_location.toLowerCase().includes(search.toLowerCase()) ||
      FORMAT_LABELS[c.format_type].toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.format_type === filter;
    return matchSearch && matchFilter;
  });

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
      <section className="flex min-h-[60vh] sm:min-h-[70vh] flex-col items-center justify-center px-5 sm:px-4">
        <p className="mb-6 rounded-full border border-border/40 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
          Atrium Europe
        </p>
        <h1 className="text-center font-display text-5xl tracking-tight sm:text-8xl lg:text-9xl">
          Build <em className="text-primary">Europe.</em>
        </h1>
        <p className="mt-5 max-w-md text-center text-base sm:text-lg leading-relaxed text-muted-foreground font-light">
          Discover the most prestigious hackathons, buildathons, and innovation challenges shaping European tech.
        </p>
        <div className="mt-10 sm:mt-12 w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-white/80 px-5 sm:px-6 py-4 sm:py-4.5 shadow-sm backdrop-blur-xl transition-shadow focus-within:shadow-md focus-within:border-border/50">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or competition type…"
              className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-4xl px-4 pb-28 sm:pb-32">
        <div className="flex flex-col gap-6 sm:gap-8">
          {isLoading ? (
            <p className="py-20 text-center text-lg text-muted-foreground">
              Loading the Gallery…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-20 text-center text-lg text-muted-foreground">
              No competitions found. Try adjusting your search.
            </p>
          ) : (
            filtered.map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))
          )}
        </div>
      </section>

      {/* Command Pill */}
      <nav className="fixed bottom-6 sm:bottom-8 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-fit" aria-label="Filter competitions">
        <div className="flex items-center gap-0.5 sm:gap-1 rounded-full border border-border/50 bg-white/70 px-1.5 sm:px-2 py-1.5 sm:py-2 shadow-xl shadow-black/[0.06] backdrop-blur-xl">
          {([
            { key: "all" as Filter, label: "All", mobileLabel: "All", icon: null },
            { key: "hackathon" as Filter, label: "Hackathons", mobileLabel: "Hack", icon: Zap },
            { key: "buildathon" as Filter, label: "Buildathons", mobileLabel: "Build", icon: Calendar },
            { key: "innovation_challenge" as Filter, label: "Challenges", mobileLabel: "Challenge", icon: Trophy },
          ]).map(({ key, label, mobileLabel, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 sm:gap-2 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-300 ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.5} />}
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{mobileLabel}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

const CompetitionCard = ({ competition }: { competition: Competition }) => {
  const ctaLabel = useMemo(
    () => CTA_OPTIONS[Math.floor(Math.random() * CTA_OPTIONS.length)],
    []
  );

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/20 bg-card shadow-sm transition-all duration-500 ease-in-out sm:hover:scale-[1.015] hover:shadow-lg hover:border-border/40 will-change-transform">
      <div className="relative flex flex-col gap-5 sm:gap-7 p-6 sm:p-10">
        {/* Format badge */}
        <span className="w-fit rounded-full border border-border/30 px-3.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {FORMAT_LABELS[competition.format_type]}
        </span>

        {/* Title */}
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-foreground leading-[1.1]">
          {competition.title}
        </h2>

        {/* Metadata bar */}
        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
            {competition.exhibition_date}
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
            {competition.venue_location}
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Trophy className="h-4 w-4 text-primary/60" strokeWidth={1.5} />
            {competition.reward_pool}
          </span>
        </div>

        {/* Patrons Row */}
        {competition.patron_entities && Array.isArray(competition.patron_entities) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(competition.patron_entities as string[]).map((patron, i) => (
              <span
                key={i}
                className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/30 transition-colors duration-500 group-hover:text-muted-foreground/60"
              >
                {patron}
              </span>
            ))}
          </div>
        )}

        {/* CTA - always visible on mobile, hover reveal on desktop */}
        <div className="flex items-center gap-3 pt-1 sm:translate-y-3 sm:opacity-0 transition-all duration-500 ease-out sm:group-hover:translate-y-0 sm:group-hover:opacity-100 will-change-transform">
          <button className="flex items-center gap-2.5 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {competition.provenance_link && (
            <a
              href={competition.provenance_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border/30 bg-white/60 px-5 py-3 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-all hover:text-foreground hover:border-border/50"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Provenance</span>
              <span className="sm:hidden">Source</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default Index;
