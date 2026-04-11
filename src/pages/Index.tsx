import { useState } from "react";
import { Link } from "react-router-dom";
import { PatronRibbon } from "@/components/PatronRibbon";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { CompetitionCard, FORMAT_LABELS, type Competition, type CompetitionFormat } from "@/components/CompetitionCard";

function generateJsonLd(c: Competition) {
  return {
    "@context": "https://schema.org",
    "@type": "Hackathon",
    name: c.title,
    description: `${c.title} is a ${FORMAT_LABELS[c.format_type]} in ${c.venue_location} on ${c.exhibition_date}`,
    location: {
      "@type": c.is_remote ? "VirtualLocation" : "Place",
      ...(c.is_remote ? { url: c.provenance_link || "" } : { name: c.venue_location }),
    },
    startDate: c.exhibition_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: c.is_remote
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    ...(c.organizer
      ? { organizer: { "@type": "Organization", name: c.organizer } }
      : {}),
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

type Filter = "onsite" | "online";

const CTA_OPTIONS = ["Explore Challenge", "View Details"];

const Index = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("onsite");

  const { data: competitions = [], isLoading } = useQuery({
    queryKey: ["public-competitions"],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 7);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("competitions")
        .select("id, title, slug, exhibition_date, reward_pool, patron_entities, venue_location, provenance_link, format_type, is_remote, organizer, editorial_summary")
        .eq("status", "published")
        .gt("exhibition_date", cutoffStr)
        .order("exhibition_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Competition[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const filtered = competitions.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.venue_location.toLowerCase().includes(search.toLowerCase()) ||
      FORMAT_LABELS[c.format_type].toLowerCase().includes(search.toLowerCase());
    const isOnline = c.is_remote === true;
    const matchFilter = filter === "online" ? isOnline : !isOnline;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Helmet>
        <title>Atrium Europe — Elite Hackathons, Buildathons & Innovation Challenges</title>
        <meta name="description" content="The curated directory of elite hackathons, buildathons, and innovation challenges across Europe. Discover competitions in AI, blockchain, green tech, and more." />
      </Helmet>

      {/* JSON-LD */}
      {filtered.map((c) => (
        <script
          key={c.id}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateJsonLd(c)) }}
        />
      ))}

      {/* Visually hidden SEO_Meta_Layer */}
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
            competitive arenas.
          </p>
        ))}
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pb-2 pt-20 sm:pt-28 overflow-hidden">
        {/* Subtle grey wash — no hue, pure depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-100/50 via-transparent to-zinc-50/20 pointer-events-none" />
        
        <h1 className="z-10 text-center text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-7xl lg:text-8xl">
          Build Europe.
        </h1>
        <p className="z-10 mt-4 max-w-lg text-center text-[17px] leading-relaxed text-muted-foreground">
          The curated directory of hackathons, buildathons, and innovation challenges across Europe.
        </p>
        <div className="z-10 mt-8 w-full max-w-lg">
          <div className="flex items-center gap-3 rounded-full border border-border bg-white/80 px-5 py-3.5 backdrop-blur-xl transition-all focus-within:border-foreground/20 focus-within:shadow-sm shadow-sm shadow-zinc-200/40">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.5} aria-label="Search" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or type..."
              className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Patron Ribbon */}
      <PatronRibbon />

      {/* Gallery */}
      <section className="mx-auto max-w-3xl px-5 pb-28 sm:pb-32 pt-2">
        <div className="flex flex-col gap-5">
          {isLoading ? (
            <div className="py-20"><div className="atrium-loader" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-6 h-px w-16 bg-primary/40" />
              <p className="text-[15px] font-medium tracking-tight text-muted-foreground">No exhibitions match your search.</p>
            </div>
          ) : (
            filtered.map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))
          )}
        </div>
      </section>

      {/* Filter Bar */}
      <nav className="fixed bottom-6 sm:bottom-8 left-1/2 z-50 -translate-x-1/2" aria-label="Filter competitions">
        <div className="flex items-center rounded-full border border-[#E4E4E7] bg-white/95 px-1 py-1 shadow-xl shadow-zinc-300/30 backdrop-blur-xl">
          {([
            { key: "onsite" as Filter, label: "Onsite" },
            { key: "online" as Filter, label: "Online" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-5 sm:px-7 py-2 text-[13px] font-medium transition-all ${
                filter === key
                  ? "bg-[#111111] text-white shadow-sm"
                  : "text-[#52525B] hover:text-[#111111]"
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

export default Index;
