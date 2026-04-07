import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, MapPin, Trophy, ArrowRight, ExternalLink, Wifi } from "lucide-react";

interface Exhibition {
  id: string;
  title: string;
  exhibition_date: string;
  reward_pool: string;
  patron_entities: string[] | null;
  venue_location: string;
  provenance_link: string | null;
}

function generateJsonLd(ex: Exhibition) {
  return {
    "@context": "https://schema.org",
    "@type": ["Hackathon", "ExhibitionEvent"],
    name: ex.title,
    description: `${ex.title} is a technical exhibition occurring in ${ex.venue_location} on ${ex.exhibition_date}`,
    location: {
      "@type": "Place",
      name: ex.venue_location,
    },
    offers: {
      "@type": "Offer",
      description: `Prize pool: ${ex.reward_pool}`,
    },
  };
}

type Filter = "all" | "upcoming";

const Index = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: exhibitions = [], isLoading } = useQuery({
    queryKey: ["public-exhibitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_exhibitions")
        .select("id, title, exhibition_date, reward_pool, patron_entities, venue_location, provenance_link")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Exhibition[];
    },
  });

  const filtered = exhibitions.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue_location.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD */}
      {filtered.map((ex) => (
        <script
          key={ex.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateJsonLd(ex)) }}
        />
      ))}

      {/* Visually hidden SEO content */}
      <div className="visually-hidden" aria-hidden="false">
        <h2>Atrium Europe — The Curated Directory of European Technical Exhibitions</h2>
        <p>
          Atrium is the premier platform for discovering elite technical exhibitions, hackathons,
          buildathons, and innovation programs across Europe. Our curated gallery features the
          most prestigious competitions in artificial intelligence, blockchain, sustainable
          technology, digital health, and deep tech — spanning major innovation hubs from
          London's Silicon Roundabout to Berlin's Silicon Allee, Stockholm's Kista Science City,
          Paris's Station F, and Amsterdam's Startup Village.
        </p>
        <p>
          Each technical exhibition on Atrium specializes in cutting-edge domains: AI Agentic
          Workflows, sovereign aerospace computing, decentralized finance (DeFi), quantum
          computing applications, and climate technology. Our exhibitions connect participants
          with leading institutions including the EuroTech Universities Alliance (TUM, DTU,
          EPFL), the SECCLO Consortium (Aalto University, KTH Royal Institute of Technology),
          and the EULiST Alliance.
        </p>
        {filtered.map((ex) => (
          <p key={ex.id}>
            {ex.title} is a technical exhibition occurring in {ex.venue_location} on{" "}
            {ex.exhibition_date}. The prize pool is {ex.reward_pool}.
            {ex.patron_entities && Array.isArray(ex.patron_entities)
              ? ` Patrons include ${(ex.patron_entities as string[]).join(", ")}.`
              : ""}
          </p>
        ))}
      </div>

      {/* Hero */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Atrium Europe
        </p>
        <h1 className="text-6xl font-bold tracking-tight sm:text-8xl lg:text-9xl">
          Curate. Compete.
          <br />
          <span className="text-primary">Build Europe.</span>
        </h1>
        <p className="mt-4 max-w-lg text-center text-lg text-muted-foreground">
          The curated gallery of elite technical exhibitions, hackathons &amp; innovation
          programs across Europe.
        </p>
        <div className="mt-10 w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-full border border-border/50 bg-white/70 px-6 py-4 shadow-lg shadow-black/[0.03] backdrop-blur-xl">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find your next technical exhibition…"
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
              No exhibitions found. Try adjusting your search.
            </p>
          ) : (
            filtered.map((exhibition) => (
              <ExhibitionCard key={exhibition.id} exhibition={exhibition} />
            ))
          )}
        </div>
      </section>

      {/* Command Pill */}
      <nav className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2" aria-label="Filter exhibitions">
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-white/70 px-2 py-2 shadow-xl shadow-black/[0.06] backdrop-blur-xl">
          {([
            { key: "all" as Filter, label: "All", icon: null },
            { key: "upcoming" as Filter, label: "Upcoming", icon: Calendar },
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

const ExhibitionCard = ({ exhibition }: { exhibition: Exhibition }) => {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md shadow-black/[0.04] transition-all duration-500 ease-in-out hover:scale-[1.02] hover:shadow-xl hover:shadow-black/[0.07]">
      {/* Geometric decoration */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-foreground/[0.04] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full border border-foreground/[0.04] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

      <div className="relative flex flex-col gap-6 p-8 sm:p-10">
        {/* Title */}
        <h2 className="text-3xl font-bold tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
          {exhibition.title}
        </h2>

        {/* Metadata bar — archival mono style */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            {exhibition.exhibition_date}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
            {exhibition.venue_location}
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4" strokeWidth={1.5} />
            {exhibition.reward_pool}
          </span>
        </div>

        {/* Patrons Row */}
        {exhibition.patron_entities && Array.isArray(exhibition.patron_entities) && (
          <div className="flex flex-wrap gap-4">
            {(exhibition.patron_entities as string[]).map((patron, i) => (
              <span
                key={i}
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground/40 transition-all duration-500 group-hover:text-muted-foreground"
              >
                {patron}
              </span>
            ))}
          </div>
        )}

        {/* Hover CTA */}
        <div className="flex translate-y-4 items-center gap-2 opacity-0 transition-all duration-500 ease-in-out group-hover:translate-y-0 group-hover:opacity-100">
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Exhibit Your Solution
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {exhibition.provenance_link && (
            <a
              href={exhibition.provenance_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-border/50 bg-white/50 px-5 py-2.5 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              Examine Provenance
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default Index;
