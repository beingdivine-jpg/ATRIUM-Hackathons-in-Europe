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
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Atrium Europe
        </p>
        <h1 className="text-center text-6xl font-bold tracking-tight sm:text-8xl lg:text-9xl">
          Build Europe.
        </h1>
        <p className="mt-4 max-w-xl text-center text-lg text-muted-foreground">
          Find the elite hackathons, buildathons, and innovation challenges shaping the future of European tech.
        </p>
        <div className="mt-10 w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-full border border-border/50 bg-white/70 px-6 py-4 shadow-lg shadow-black/[0.03] backdrop-blur-xl">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or competition type…"
              className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-4xl px-4 pb-32">
        <div className="flex flex-col gap-8">
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
      <nav className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2" aria-label="Filter competitions">
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-white/70 px-2 py-2 shadow-xl shadow-black/[0.06] backdrop-blur-xl">
          {([
            { key: "all" as Filter, label: "All", icon: null },
            { key: "hackathon" as Filter, label: "Hackathons", icon: Zap },
            { key: "buildathon" as Filter, label: "Buildathons", icon: Calendar },
            { key: "innovation_challenge" as Filter, label: "Challenges", icon: Trophy },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
              <span>{label}</span>
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
    <article className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md shadow-black/[0.04] transition-all duration-500 ease-in-out sm:hover:scale-[1.02] hover:shadow-xl hover:shadow-black/[0.07] will-change-transform">
      {/* Geometric decoration */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-foreground/[0.04] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full border border-foreground/[0.04] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

      <div className="relative flex flex-col gap-4 sm:gap-6 p-5 sm:p-10">
        {/* Format badge */}
        <span className="w-fit rounded-full border border-border/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {FORMAT_LABELS[competition.format_type]}
        </span>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tighter text-foreground">
          {competition.title}
        </h2>

        {/* Metadata bar */}
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 font-mono text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.5} />
            {FORMAT_LABELS[competition.format_type]}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.5} />
            {competition.exhibition_date}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.5} />
            {competition.venue_location}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.5} />
            {competition.reward_pool}
          </span>
        </div>

        {/* Patrons Row */}
        {competition.patron_entities && Array.isArray(competition.patron_entities) && (
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {(competition.patron_entities as string[]).map((patron, i) => (
              <span
                key={i}
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground/40 transition-all duration-500 group-hover:text-muted-foreground"
              >
                {patron}
              </span>
            ))}
          </div>
        )}

        {/* CTA - always visible on mobile, hover on desktop */}
        <div className="flex items-center gap-2 sm:translate-y-4 sm:opacity-0 transition-all duration-500 ease-in-out sm:group-hover:translate-y-0 sm:group-hover:opacity-100 will-change-transform">
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {competition.provenance_link && (
            <a
              href={competition.provenance_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-border/50 bg-white/50 px-5 py-2.5 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Examine Provenance</span>
              <span className="sm:hidden">Source</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default Index;
