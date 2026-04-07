import { useState } from "react";
import { Search, Calendar, MapPin, Wifi, ExternalLink, Trophy, ArrowRight } from "lucide-react";

type EventFormat = "in-person" | "remote" | "hybrid";

interface Exhibition {
  id: number;
  name: string;
  tagline: string;
  city: string;
  country: string;
  dates: string;
  startDate: string;
  endDate: string;
  prize: string;
  format: EventFormat;
  gradient: string;
  upcoming: boolean;
  organizer: string;
  maxAttendees: number;
  domain: string;
}

const exhibitions: Exhibition[] = [
  {
    id: 1,
    name: "AI Hack London",
    tagline: "48 hours to reshape intelligence",
    city: "London",
    country: "UK",
    dates: "Jun 14–16, 2026",
    startDate: "2026-06-14",
    endDate: "2026-06-16",
    prize: "€50,000",
    format: "in-person",
    gradient: "from-emerald-50 via-teal-50/60 to-transparent",
    upcoming: true,
    organizer: "London AI Collective",
    maxAttendees: 500,
    domain: "AI Agentic Workflows",
  },
  {
    id: 2,
    name: "GreenTech Buildathon",
    tagline: "Code for the planet",
    city: "Stockholm",
    country: "SE",
    dates: "Jul 5–7, 2026",
    startDate: "2026-07-05",
    endDate: "2026-07-07",
    prize: "€30,000",
    format: "hybrid",
    gradient: "from-lime-50 via-green-50/60 to-transparent",
    upcoming: true,
    organizer: "Nordic Green Innovation Hub",
    maxAttendees: 300,
    domain: "Sustainable Technology",
  },
  {
    id: 3,
    name: "Web3 Innovate Berlin",
    tagline: "Decentralize everything",
    city: "Berlin",
    country: "DE",
    dates: "Aug 22–24, 2026",
    startDate: "2026-08-22",
    endDate: "2026-08-24",
    prize: "€75,000",
    format: "in-person",
    gradient: "from-violet-50 via-purple-50/60 to-transparent",
    upcoming: true,
    organizer: "Berlin Blockchain Consortium",
    maxAttendees: 800,
    domain: "Decentralized Systems",
  },
  {
    id: 4,
    name: "ETHParis Summit",
    tagline: "The future of Ethereum, in Paris",
    city: "Paris",
    country: "FR",
    dates: "Sep 10–12, 2026",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    prize: "€100,000",
    format: "in-person",
    gradient: "from-blue-50 via-indigo-50/60 to-transparent",
    upcoming: true,
    organizer: "Ethereum France Association",
    maxAttendees: 1200,
    domain: "Ethereum & Layer 2",
  },
  {
    id: 5,
    name: "HealthTech Challenge",
    tagline: "Hack healthcare's hardest problems",
    city: "Amsterdam",
    country: "NL",
    dates: "Oct 3–5, 2026",
    startDate: "2026-10-03",
    endDate: "2026-10-05",
    prize: "€40,000",
    format: "remote",
    gradient: "from-rose-50 via-pink-50/60 to-transparent",
    upcoming: false,
    organizer: "Dutch Health Innovation Lab",
    maxAttendees: 400,
    domain: "Digital Health & MedTech",
  },
];

type Filter = "all" | "upcoming" | "in-person" | "remote";

function generateJsonLd(exhibition: Exhibition) {
  return {
    "@context": "https://schema.org",
    "@type": ["Hackathon", "ExhibitionEvent"],
    name: exhibition.name,
    description: exhibition.tagline,
    startDate: exhibition.startDate,
    endDate: exhibition.endDate,
    location: {
      "@type": exhibition.format === "remote" ? "VirtualLocation" : "Place",
      name: `${exhibition.city}, ${exhibition.country}`,
      ...(exhibition.format === "remote"
        ? { url: "https://atrium.eu" }
        : {
            address: {
              "@type": "PostalAddress",
              addressLocality: exhibition.city,
              addressCountry: exhibition.country,
            },
          }),
    },
    organizer: {
      "@type": "Organization",
      name: exhibition.organizer,
    },
    maximumAttendeeCapacity: exhibition.maxAttendees,
    eventAttendanceMode:
      exhibition.format === "remote"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : exhibition.format === "hybrid"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    offers: {
      "@type": "Offer",
      description: `Prize pool: ${exhibition.prize}`,
    },
  };
}

const Index = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = exhibitions.filter((e) => {
    const matchSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "upcoming" && e.upcoming) ||
      (filter === "in-person" && e.format === "in-person") ||
      (filter === "remote" && e.format === "remote");
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD for all exhibitions */}
      {exhibitions.map((ex) => (
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
        <p>
          Whether you are searching for AI hackathons in London 2026, blockchain competitions in
          Berlin, green technology buildathons in Stockholm, Ethereum summits in Paris, or
          health-tech challenges in Amsterdam — Atrium curates the definitive collection of
          Europe's most impactful technical competitions. Find upcoming in-person, remote, and
          hybrid exhibitions with prize pools ranging from €30,000 to €100,000+.
        </p>
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
          {filtered.map((exhibition) => (
            <ExhibitionCard key={exhibition.id} exhibition={exhibition} />
          ))}
          {filtered.length === 0 && (
            <p className="py-20 text-center text-lg text-muted-foreground">
              No exhibitions found. Try adjusting your search or filters.
            </p>
          )}
        </div>
      </section>

      {/* Command Pill */}
      <nav className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2" aria-label="Filter exhibitions">
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-white/70 px-2 py-2 shadow-xl shadow-black/[0.06] backdrop-blur-xl">
          {(
            [
              { key: "all", label: "All", icon: null },
              { key: "upcoming", label: "Upcoming", icon: Calendar },
              { key: "in-person", label: "In-Person", icon: MapPin },
              { key: "remote", label: "Remote", icon: Wifi },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
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
              <span className="hidden sm:inline">{label}</span>
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
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${exhibition.gradient}`} />

      {/* Geometric decoration */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-foreground/[0.04] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full border border-foreground/[0.04] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

      <div className="relative flex flex-col gap-6 p-8 sm:p-10">
        {/* Top */}
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {exhibition.format === "in-person"
              ? "In-Person"
              : exhibition.format === "remote"
                ? "Remote"
                : "Hybrid"}
          </span>
          {exhibition.upcoming && (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              Upcoming Exhibition
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {exhibition.name}
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">{exhibition.tagline}</p>
        </div>

        {/* Info bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            {exhibition.dates}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
            {exhibition.city}, {exhibition.country}
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4" strokeWidth={1.5} />
            {exhibition.prize}
          </span>
        </div>

        {/* Hover CTA */}
        <div className="flex translate-y-4 items-center gap-2 opacity-0 transition-all duration-500 ease-in-out group-hover:translate-y-0 group-hover:opacity-100">
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Exhibit Your Solution
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
            Details
          </button>
        </div>
      </div>
    </article>
  );
};

export default Index;
