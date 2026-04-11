import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, ExternalLink, Tag, Users, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type CompetitionFormat = 'hackathon' | 'buildathon' | 'innovation_challenge';

const FORMAT_LABELS: Record<CompetitionFormat, string> = {
  hackathon: 'Hackathon',
  buildathon: 'Buildathon',
  innovation_challenge: 'Innovation Challenge',
};

interface CompetitionFull {
  id: string;
  title: string;
  exhibition_date: string;
  end_date: string | null;
  reward_pool: string;
  patron_entities: string[] | null;
  venue_location: string;
  provenance_link: string | null;
  format_type: CompetitionFormat;
  organizer: string | null;
  description: string | null;
  editorial_summary: string | null;
  application_link: string | null;
  tags: string[] | null;
  is_remote: boolean | null;
}

function generateDetailJsonLd(c: CompetitionFull) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hackathon',
    name: c.title,
    description: c.editorial_summary || c.description || `${c.title} is a ${FORMAT_LABELS[c.format_type]} in ${c.venue_location}`,
    location: {
      '@type': c.is_remote ? 'VirtualLocation' : 'Place',
      ...(c.is_remote ? { url: c.application_link || '' } : { name: c.venue_location }),
    },
    startDate: c.exhibition_date,
    ...(c.end_date ? { endDate: c.end_date } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: c.is_remote
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    ...(c.organizer
      ? { organizer: { '@type': 'Organization', name: c.organizer } }
      : {}),
    offers: {
      '@type': 'Offer',
      description: `Prize pool: ${c.reward_pool}`,
    },
    ...(c.patron_entities && (c.patron_entities as string[]).length > 0
      ? {
          funder: (c.patron_entities as string[]).map((name) => ({
            '@type': 'Organization',
            name,
          })),
        }
      : {}),
  };
}

/** Generate a short executive definition (first ~50 words of editorial, or a constructed fallback). */
function getExecutiveDefinition(c: CompetitionFull): string {
  if (c.editorial_summary) {
    // Take first two sentences or ~60 words
    const sentences = c.editorial_summary.match(/[^.!?]+[.!?]+/g) || [c.editorial_summary];
    let def = '';
    for (const s of sentences) {
      if ((def + s).split(/\s+/).length > 60) break;
      def += s;
    }
    return def.trim() || sentences[0].trim();
  }
  return `${c.title} is a ${FORMAT_LABELS[c.format_type].toLowerCase()} taking place in ${c.venue_location}, offering a prize pool of ${c.reward_pool}.`;
}

const CompetitionDetail = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const identifier = slug || id;
  const isLegacyId = !!id;

  const { data: competition, isLoading, error } = useQuery({
    queryKey: ['competition', identifier],
    queryFn: async () => {
      let query = supabase
        .from('competitions')
        .select('*')
        .eq('status', 'published');

      if (isLegacyId) {
        query = query.eq('id', identifier!);
      } else {
        query = query.eq('slug', identifier!);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data as CompetitionFull & { slug: string };
    },
    enabled: !!identifier,
    staleTime: 5 * 60 * 1000,
  });

  // Redirect legacy ID URLs to slug URLs
  if (isLegacyId && competition?.slug) {
    navigate(`/competition/${competition.slug}`, { replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Helmet>
          <title>Competition Not Found — Atrium Europe</title>
        </Helmet>
        <p className="text-lg font-medium text-foreground">Competition not found</p>
        <p className="mt-2 text-[14px] text-muted-foreground">
          This competition may have been removed or isn't published yet.
        </p>
        <Link to="/">
          <Button variant="outline" className="mt-6 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" aria-label="Back" />
            Back to directory
          </Button>
        </Link>
      </div>
    );
  }

  const pageTitle = `${competition.title} — ${FORMAT_LABELS[competition.format_type]} | Atrium Europe`;
  const executiveDef = getExecutiveDefinition(competition);
  const pageDescription = executiveDef.slice(0, 160);

  const dateRange = competition.end_date
    ? `${competition.exhibition_date} — ${competition.end_date}`
    : competition.exhibition_date;

  const techStack = competition.tags?.length
    ? competition.tags.slice(0, 4).join(' · ')
    : '—';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://atrium.eu/competition/${competition.slug || identifier}`} />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateDetailJsonLd(competition)) }}
      />

      {/* Header */}
      <header className="mx-auto max-w-2xl px-5 pt-8 sm:pt-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-label="Back" />
          Back
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-8 pb-20">
        {/* Format badge */}
        <span className="inline-block rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
          {FORMAT_LABELS[competition.format_type]}
        </span>

        {/* H1 */}
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl leading-tight">
          {competition.title}
        </h1>

        {competition.organizer && (
          <p className="mt-2 text-[15px] text-muted-foreground">
            by {competition.organizer}
          </p>
        )}

        {/* ── Executive Definition ── */}
        <p className="mt-6 text-center text-[17px] sm:text-[18px] leading-relaxed text-foreground/90 max-w-xl mx-auto">
          {executiveDef}
        </p>

        {/* ── High-Signal Fact Table ── */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-6">
          <FactCell label="Reward Pool" value={competition.reward_pool} />
          <FactCell label="Format" value={FORMAT_LABELS[competition.format_type]} />
          <FactCell label="Venue" value={competition.venue_location} />
          <FactCell label="Tech Stack" value={techStack} />
        </div>

        {/* Separator */}
        <div className="mt-12 mb-10 h-px bg-border" />

        {/* ── Vision Section ── */}
        {(competition.editorial_summary || competition.description) && (
          <section className="mb-10">
            <h3 className="text-[15px] font-semibold text-foreground mb-4">
              What is the vision for {competition.title}?
            </h3>
            <p className="text-[15px] leading-[1.75] text-muted-foreground">
              {competition.editorial_summary || competition.description}
            </p>
          </section>
        )}

        {/* ── Participation Section ── */}
        <section className="mb-10">
          <h3 className="text-[15px] font-semibold text-foreground mb-4">
            How can builders participate in this challenge?
          </h3>
          <div className="flex flex-col gap-3 text-[15px] leading-[1.75] text-muted-foreground">
            <p>
              {competition.title} takes place {competition.is_remote ? 'online' : `in ${competition.venue_location}`} starting {dateRange}.
              {competition.reward_pool !== '—' && ` Competitors are vying for a prize pool of ${competition.reward_pool}.`}
            </p>
          </div>
        </section>

        {/* Tags */}
        {competition.tags && competition.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {competition.tags.map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[12px] font-medium text-muted-foreground"
              >
                <Tag className="h-3 w-3" strokeWidth={1.5} aria-label="Tag" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Patrons */}
        {competition.patron_entities && Array.isArray(competition.patron_entities) && (competition.patron_entities as string[]).length > 0 && (
          <div className="mb-8">
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Patrons</p>
            <div className="flex flex-wrap gap-2">
              {(competition.patron_entities as string[]).map((patron, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground"
                >
                  <Users className="h-3 w-3" strokeWidth={1.5} aria-label="Patron" />
                  {patron}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {competition.application_link && (
          <div className="mt-10">
            <a href={competition.application_link} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-full h-12 px-8 text-[15px] font-semibold gap-2">
                Apply Now
                <ExternalLink className="h-4 w-4" strokeWidth={2} aria-label="External link" />
              </Button>
            </a>
          </div>
        )}
      </main>
    </div>
  );
};

/** A single cell in the borderless Fact Table. */
const FactCell = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
      {label}
    </p>
    <p className="text-[15px] font-semibold text-foreground leading-snug">
      {value}
    </p>
  </div>
);

export default CompetitionDetail;
