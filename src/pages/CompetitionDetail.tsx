import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-lg font-medium text-foreground">Competition not found</p>
        <p className="mt-2 text-[14px] text-muted-foreground">
          This competition may have been removed or isn't published yet.
        </p>
        <Link to="/">
          <Button variant="outline" className="mt-6 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to directory
          </Button>
        </Link>
      </div>
    );
  }

  const dateRange = competition.end_date
    ? `${competition.exhibition_date} — ${competition.end_date}`
    : competition.exhibition_date;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Hackathon',
            name: competition.title,
            description: competition.description,
            location: { '@type': 'Place', name: competition.venue_location },
            startDate: competition.exhibition_date,
            ...(competition.end_date ? { endDate: competition.end_date } : {}),
            offers: { '@type': 'Offer', description: `Prize pool: ${competition.reward_pool}` },
          }),
        }}
      />

      {/* Header */}
      <header className="mx-auto max-w-2xl px-5 pt-8 sm:pt-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back
        </Link>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-5 pt-8 pb-20">
        {/* Format badge */}
        <span className="inline-block rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
          {FORMAT_LABELS[competition.format_type]}
        </span>

        {/* Title */}
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl leading-tight">
          {competition.title}
        </h1>

        {/* Organizer */}
        {competition.organizer && (
          <p className="mt-2 text-[15px] text-muted-foreground">
            by {competition.organizer}
          </p>
        )}

        {/* Meta grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetaItem icon={Calendar} label="Date" value={dateRange} />
          <MetaItem icon={MapPin} label="Location" value={competition.venue_location} />
          <MetaItem icon={Trophy} label="Prize Pool" value={competition.reward_pool} />
          {competition.is_remote && (
            <MetaItem icon={Globe} label="Format" value="Remote / Online" />
          )}
        </div>

        {/* Tags */}
        {competition.tags && competition.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {competition.tags.map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[12px] font-medium text-muted-foreground"
              >
                <Tag className="h-3 w-3" strokeWidth={1.5} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Patrons */}
        {competition.patron_entities && Array.isArray(competition.patron_entities) && (competition.patron_entities as string[]).length > 0 && (
          <div className="mt-6">
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Patrons</p>
            <div className="flex flex-wrap gap-2">
              {(competition.patron_entities as string[]).map((patron, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground"
                >
                  <Users className="h-3 w-3" strokeWidth={1.5} />
                  {patron}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {competition.description && (
          <div className="mt-8">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {competition.description}
            </p>
          </div>
        )}

        {/* CTA */}
        {competition.application_link && (
          <div className="mt-10">
            <a href={competition.application_link} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-full h-12 px-8 text-[15px] font-semibold gap-2">
                Apply Now
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
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
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    </div>
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-[14px] font-medium text-foreground mt-0.5">{value}</p>
    </div>
  </div>
);

export default CompetitionDetail;
