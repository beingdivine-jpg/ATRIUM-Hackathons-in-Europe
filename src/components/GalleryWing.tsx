import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CompetitionCard, type Competition } from "@/components/CompetitionCard";

interface GalleryWingProps {
  /** The wing title, e.g. "The AI Wing" or "Berlin" */
  title: string;
  /** 2-sentence curatorial statement */
  curatorial: string;
  /** SEO page title */
  pageTitle: string;
  /** SEO meta description */
  metaDescription: string;
  /** Canonical path, e.g. /wing/ai */
  canonicalPath: string;
  /** Filtered competitions to display */
  competitions: Competition[];
  /** Loading state */
  isLoading: boolean;
}

function parsePrize(pool: string): number {
  const cleaned = pool.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function formatTotal(total: number): string {
  if (total >= 1_000_000) return `€${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `€${(total / 1_000).toFixed(0)}k`;
  if (total > 0) return `€${total}`;
  return "—";
}

export const GalleryWing = ({
  title,
  curatorial,
  pageTitle,
  metaDescription,
  canonicalPath,
  competitions,
  isLoading,
}: GalleryWingProps) => {
  const stats = useMemo(() => {
    const count = competitions.length;
    const totalPool = competitions.reduce((sum, c) => sum + parsePrize(c.reward_pool), 0);

    // Top 3 cities by frequency
    const cityCount: Record<string, number> = {};
    for (const c of competitions) {
      const city = c.venue_location.split(",")[0].trim();
      cityCount[city] = (cityCount[city] || 0) + 1;
    }
    const topHubs = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([city]) => city)
      .join(", ");

    return { count, totalPool: formatTotal(totalPool), topHubs: topHubs || "—" };
  }, [competitions]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <link rel="canonical" href={`https://atrium.eu${canonicalPath}`} />
      </Helmet>

      {/* Back nav */}
      <header className="mx-auto max-w-3xl px-5 pt-8 sm:pt-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-label="Back" />
          Back to Gallery
        </Link>
      </header>

      {/* Wing Header */}
      <section className="mx-auto max-w-3xl px-5 pt-12 sm:pt-16 pb-8">
        <h1 className="text-4xl font-extrabold tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="mt-5 max-w-xl text-[16px] sm:text-[17px] leading-relaxed text-muted-foreground">
          {curatorial}
        </p>
      </section>

      {/* Stats Bar */}
      <div className="mx-auto max-w-3xl px-5 pb-10">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-border py-5">
          <StatPill label="Active Challenges" value={String(stats.count)} />
          <StatPill label="Combined Reward Pool" value={stats.totalPool} />
          <StatPill label="Leading Hubs" value={stats.topHubs} />
        </div>
      </div>

      {/* Curated Feed */}
      <section className="mx-auto max-w-3xl px-5 pb-28 sm:pb-32">
        <div className="flex flex-col gap-16">
          {isLoading ? (
            <p className="py-20 text-center text-muted-foreground">Loading…</p>
          ) : competitions.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">No competitions found in this wing.</p>
          ) : (
            competitions.map((c) => (
              <CompetitionCard key={c.id} competition={c} />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
      {label}
    </span>
    <span className="text-[16px] font-semibold text-foreground">
      {value}
    </span>
  </div>
);
