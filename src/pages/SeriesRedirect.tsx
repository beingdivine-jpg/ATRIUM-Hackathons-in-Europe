import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Series URL handler: /series/:seriesSlug
 * Redirects to the most recent upcoming edition of a recurring competition series.
 * If no upcoming edition exists, redirects to the most recent past edition.
 */
const SeriesRedirect = () => {
  const { seriesSlug } = useParams<{ seriesSlug: string }>();

  const { data: target, isLoading, error } = useQuery({
    queryKey: ['series-redirect', seriesSlug],
    queryFn: async () => {
      // Find upcoming editions first (sorted by date ascending — nearest first)
      const { data: upcoming } = await supabase
        .from('competitions')
        .select('slug, exhibition_date')
        .eq('series_slug', seriesSlug!)
        .in('status', ['published', 'archived'])
        .gte('exhibition_date', new Date().toISOString().slice(0, 10))
        .order('exhibition_date', { ascending: true })
        .limit(1);

      if (upcoming && upcoming.length > 0) {
        return upcoming[0].slug;
      }

      // Fallback: most recent past edition
      const { data: past } = await supabase
        .from('competitions')
        .select('slug, exhibition_date')
        .eq('series_slug', seriesSlug!)
        .in('status', ['published', 'archived'])
        .order('exhibition_date', { ascending: false })
        .limit(1);

      if (past && past.length > 0) {
        return past[0].slug;
      }

      return null;
    },
    enabled: !!seriesSlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (target) {
    return <Navigate to={`/competition/${target}`} replace />;
  }

  return <Navigate to="/" replace />;
};

export default SeriesRedirect;
