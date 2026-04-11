import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Calendar, MapPin, Trophy, ExternalLink,
  Globe, Tag, Users, Loader2
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
  application_link: string | null;
  tags: string[] | null;
  is_remote: boolean | null;
}

function generateDetailJsonLd(c: CompetitionFull) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hackathon',
    name: c.title,
    description: c.description || `${c.title} is a ${FORMAT_LABELS[c.format_type]} in ${c.venue_location}`,
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

const CompetitionDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: competition, isLoading, error } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', id!)
        .eq('status', 'published')
        .single();
      if (error) throw error;
      return data as CompetitionFull;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

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
  const pageDescription = `${competition.title} in ${competition.venue_location}. Prize pool: ${competition.reward_pool}. ${competition.description?.slice(0, 120) || `A ${FORMAT_LABELS[competition.format_type].toLowerCase()} starting ${competition.exhibition_date}.`}`;

  const dateRange = competition.end_date
    ? `${competition.exhibition_date} — ${competition.end_date}`
    : competition.exhibition_date;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://atrium.eu/competition/${competition.id}`} />
      </Helmet>

      {/* JSON-LD */}
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

      {/* Content */}
      <main className="mx-auto max-w-2xl px-5 pt-8 pb-20">
        <span className="inline-block rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
          {FORMAT_LABELS[competition.format_type]}
        </span>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl leading-tight">
          {competition.title}
        </h1>

        {competition.organizer && (
          <p className="mt-2 text-[15px] text-muted-foreground">
            by {competition.organizer}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetaItem icon={Calendar} label="Date" value={dateRange} />
          <MetaItem icon={MapPin} label="Location" value={competition.venue_location} />
          <MetaItem icon={Trophy} label="Prize Pool" value={competition.reward_pool} />
          {competition.is_remote && (
            <MetaItem icon={Globe} label="Format" value="Remote / Online" />
          )}
        </div>

        {competition.tags && competition.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
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

        {competition.patron_entities && Array.isArray(competition.patron_entities) && (competition.patron_entities as string[]).length > 0 && (
          <div className="mt-6">
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

        {competition.description && (
          <div className="mt-8">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {competition.description}
            </p>
          </div>
        )}

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

const MetaItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-label={label} />
    </div>
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-[14px] font-medium text-foreground mt-0.5">{value}</p>
    </div>
  </div>
);

export default CompetitionDetail;