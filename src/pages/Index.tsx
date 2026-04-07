import { useState } from "react";
import { Search, Calendar, MapPin, Wifi, ExternalLink, Trophy, ArrowRight } from "lucide-react";

type EventFormat = "in-person" | "remote" | "hybrid";

interface HackEvent {
  id: number;
  name: string;
  tagline: string;
  city: string;
  country: string;
  dates: string;
  prize: string;
  format: EventFormat;
  gradient: string;
  upcoming: boolean;
}

const events: HackEvent[] = [
  {
    id: 1,
    name: "AI Hack London",
    tagline: "48 hours to reshape intelligence",
    city: "London",
    country: "UK",
    dates: "Jun 14–16, 2026",
    prize: "€50,000",
    format: "in-person",
    gradient: "from-emerald-900/40 via-teal-900/20 to-transparent",
    upcoming: true,
  },
  {
    id: 2,
    name: "GreenTech Buildathon",
    tagline: "Code for the planet",
    city: "Stockholm",
    country: "SE",
    dates: "Jul 5–7, 2026",
    prize: "€30,000",
    format: "hybrid",
    gradient: "from-lime-900/40 via-green-900/20 to-transparent",
    upcoming: true,
  },
  {
    id: 3,
    name: "Web3 Innovate Berlin",
    tagline: "Decentralize everything",
    city: "Berlin",
    country: "DE",
    dates: "Aug 22–24, 2026",
    prize: "€75,000",
    format: "in-person",
    gradient: "from-violet-900/40 via-purple-900/20 to-transparent",
    upcoming: true,
  },
  {
    id: 4,
    name: "ETHParis Summit",
    tagline: "The future of Ethereum, in Paris",
    city: "Paris",
    country: "FR",
    dates: "Sep 10–12, 2026",
    prize: "€100,000",
    format: "in-person",
    gradient: "from-blue-900/40 via-indigo-900/20 to-transparent",
    upcoming: true,
  },
  {
    id: 5,
    name: "HealthTech Challenge",
    tagline: "Hack healthcare's hardest problems",
    city: "Amsterdam",
    country: "NL",
    dates: "Oct 3–5, 2026",
    prize: "€40,000",
    format: "remote",
    gradient: "from-rose-900/40 via-pink-900/20 to-transparent",
    upcoming: false,
  },
];

type Filter = "all" | "upcoming" | "in-person" | "remote";

const Index = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = events.filter((e) => {
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
      {/* Hero */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <h1 className="text-6xl font-bold tracking-tight sm:text-8xl lg:text-9xl">
          Build Europe.
        </h1>
        <p className="mt-4 max-w-md text-center text-muted-foreground text-lg">
          The definitive directory of hackathons, buildathons & innovation programs across Europe.
        </p>
        <div className="mt-10 w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-full bg-white/5 px-6 py-4 backdrop-blur-md">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Where will you build next?"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
            />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-4xl px-4 pb-32">
        <div className="flex flex-col gap-8">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-20 text-lg">
              No events found. Try adjusting your search or filters.
            </p>
          )}
        </div>
      </section>

      {/* Command Pill */}
      <nav className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-card/80 px-2 py-2 backdrop-blur-xl shadow-2xl">
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

const EventCard = ({ event }: { event: HackEvent }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card transition-all duration-500 ease-in-out hover:scale-[1.02]">
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient}`} />

      {/* Geometric decoration */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full border border-white/5 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

      <div className="relative flex flex-col gap-6 p-8 sm:p-10">
        {/* Top */}
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-muted-foreground">
            {event.format === "in-person"
              ? "In-Person"
              : event.format === "remote"
                ? "Remote"
                : "Hybrid"}
          </span>
          {event.upcoming && (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              Upcoming
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {event.name}
          </h2>
          <p className="mt-2 text-muted-foreground text-lg">{event.tagline}</p>
        </div>

        {/* Info bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" strokeWidth={1.5} />
            {event.dates}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" strokeWidth={1.5} />
            {event.city}, {event.country}
          </span>
          <span className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4" strokeWidth={1.5} />
            {event.prize}
          </span>
        </div>

        {/* Hover CTA */}
        <div className="flex translate-y-4 items-center gap-2 opacity-0 transition-all duration-500 ease-in-out group-hover:translate-y-0 group-hover:opacity-100">
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Apply Now
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
