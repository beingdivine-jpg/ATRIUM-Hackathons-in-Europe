import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, ArrowRight, ExternalLink, Tag, Users, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FORMAT_LABELS } from '@/components/CompetitionCard';
import { getCompetitionWings } from '@/lib/wings';

type CompetitionFormat = 'hackathon' | 'buildathon' | 'innovation_challenge';

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
      price: '0',
      priceCurrency: 'EUR',
      url: c.application_link || c.provenance_link || '',
      availability: 'https://schema.org/InStock',
      description: `Prize pool: ${c.reward_pool}`,
      validFrom: c.exhibition_date,
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

function generateFaqJsonLd(c: CompetitionFull) {
  const dateRange = c.end_date
    ? `${c.exhibition_date} to ${c.end_date}`
    : c.exhibition_date;

  const faqs = [
    {
      question: `What is the prize pool for ${c.title}?`,
      answer: `The prize pool for ${c.title} is ${c.reward_pool}.`,
    },
    {
      question: `Where is ${c.title} held?`,
      answer: c.is_remote
        ? `${c.title} is held online as a remote ${FORMAT_LABELS[c.format_type].toLowerCase()}.`
        : `${c.title} takes place in ${c.venue_location}.`,
    },
    {
      question: `When does ${c.title} start?`,
      answer: `${c.title} runs ${dateRange}.`,
    },
    {
      question: `What is the format of ${c.title}?`,
      answer: `${c.title} is a ${FORMAT_LABELS[c.format_type].toLowerCase()}${c.is_remote ? ' (online)' : ' (onsite)'}.`,
    },
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

function getExecutiveDefinition(c: CompetitionFull): string {
  if (c.editorial_summary) {
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

  // Derive wing links (must be before early returns)
  const wings = useMemo(() => {
    if (!competition) return [];
    const tagWings = getCompetitionWings(competition.tags, competition.title);
    const formatWing = {
      label: `The ${FORMAT_LABELS[competition.format_type]} Wing`,
      path: `/wing/${competition.format_type}`,
    };
    const city = competition.venue_location.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
    const cityWing = {
      label: `Explore ${competition.venue_location.split(",")[0].trim()}`,
      path: `/city/${city}`,
    };
    return [formatWing, cityWing, ...tagWings];
  }, [competition]);

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

  const parentWing = wings[0];
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://atrium.eu/' },
      { '@type': 'ListItem', position: 2, name: parentWing?.label || 'Gallery', item: `https://atrium.eu${parentWing?.path || '/'}` },
      { '@type': 'ListItem', position: 3, name: competition.title, item: `https://atrium.eu/competition/${competition.slug || identifier}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://atrium.eu/competition/${competition.slug || identifier}`} />
        {/* Dynamic SGE / Twitter Summary Tags */}
        <meta name="twitter:label1" content="Prize Pool" />
        <meta name="twitter:data1" content={competition.reward_pool} />
        <meta name="twitter:label2" content="Venue" />
        <meta name="twitter:data2" content={competition.venue_location} />
      </Helmet>

      {/* Event JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateDetailJsonLd(competition)) }}
      />

      {/* FAQ JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFaqJsonLd(competition)) }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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

        {/* ── High-Signal Fact Table (semantic <table>) ── */}
        <table className="mt-12 w-full border-collapse" role="presentation" aria-label={`Key facts about ${competition.title}`}>
          <tbody>
            <tr className="align-top">
              <FactCell label="Reward Pool" value={competition.reward_pool} />
              <FactCell label="Format" value={FORMAT_LABELS[competition.format_type]} />
              <FactCell label="Venue" value={competition.venue_location} />
              <FactCell label="Tech Stack" value={techStack} />
            </tr>
          </tbody>
        </table>

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

        {/* ── Prize Section ── */}
        <section className="mb-10">
          <h3 className="text-[15px] font-semibold text-foreground mb-4">
            What is the prize for {competition.title}?
          </h3>
          <p className="text-[15px] leading-[1.75] text-muted-foreground">
            The prize pool is {competition.reward_pool}. {competition.application_link ? 'Registration is open via the official event page.' : ''}
          </p>
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

        {/* ── Wing Navigation Footer ── */}
        {wings.length > 0 && (
          <nav className="mt-16 border-t border-border pt-8" aria-label="Related wings">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-4">
              Continue Exploring
            </p>
            <div className="flex flex-wrap gap-3">
              {wings.map((w) => (
                <Link
                  key={w.path}
                  to={w.path}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground"
                >
                  {w.label}
                  <ArrowRight className="h-3 w-3" strokeWidth={2} />
                </Link>
              ))}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
};

/** Semantic table cell for the Fact Table — museum-like spacing. */
const FactCell = ({ label, value }: { label: string; value: string }) => (
  <td className="py-2 pr-6 sm:pr-8 align-top">
    <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-[0.15em] mb-1">
      {label}
    </span>
    <span className="block text-[15px] font-semibold text-foreground leading-snug">
      {value}
    </span>
  </td>
);

export default CompetitionDetail;
