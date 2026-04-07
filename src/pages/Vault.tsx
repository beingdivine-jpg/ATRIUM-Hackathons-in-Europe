import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Archive, ExternalLink, LogOut, Star, Zap } from 'lucide-react';

type ExhibitionStatus = 'pending' | 'published' | 'archived';
type CompetitionFormat = 'hackathon' | 'buildathon' | 'innovation_challenge';

const FORMAT_LABELS: Record<CompetitionFormat, string> = {
  hackathon: 'Hackathon',
  buildathon: 'Buildathon',
  innovation_challenge: 'Innovation Challenge',
};

interface Competition {
  id: string;
  title: string;
  exhibition_date: string;
  reward_pool: string;
  patron_entities: string[] | null;
  venue_location: string;
  provenance_link: string | null;
  format_type: CompetitionFormat;
  status: ExhibitionStatus;
  created_at: string;
  updated_at: string;
}

const CARD_VARIANTS = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: 80, scale: 0.96, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function parsePrize(pool: string): number {
  const match = pool.replace(/[^0-9]/g, '');
  return parseInt(match, 10) || 0;
}

const Vault = () => {
  const { user, isReady } = useAuthReady();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);
  const [tab, setTab] = useState<ExhibitionStatus>('pending');
  const [prestigeOnly, setPrestigeOnly] = useState(false);
  const [formatFilter, setFormatFilter] = useState<CompetitionFormat | 'all'>('all');
  const queryClient = useQueryClient();

  const { data: rawCompetitions = [], isLoading } = useQuery({
    queryKey: ['vault-competitions', tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('status', tab)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Competition[];
    },
    enabled: isReady && !!user && isAdmin === true,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['vault-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: isReady && !!user && isAdmin === true,
  });

  const competitions = useMemo(() => {
    let list = rawCompetitions;
    if (formatFilter !== 'all') {
      list = list.filter((c) => c.format_type === formatFilter);
    }
    if (prestigeOnly) {
      list = list.filter((c) => parsePrize(c.reward_pool) >= 30000);
    }
    return list;
  }, [rawCompetitions, formatFilter, prestigeOnly]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExhibitionStatus }) => {
      const { error } = await supabase
        .from('competitions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['vault-competitions'] });
      queryClient.invalidateQueries({ queryKey: ['vault-pending-count'] });
      toast.success(
        status === 'published'
          ? 'Competition moved to the Gallery floor.'
          : 'Competition archived.'
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!isReady || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-sm text-muted-foreground tracking-wider">Loading The Vault…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/entrance" replace />;
  if (isAdmin === false) {
    toast.error('Access to the Vault is restricted to appointed curators.');
    return <Navigate to="/" replace />;
  }

  const tabs: { key: ExhibitionStatus; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'published', label: 'Published' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground">
            Atrium Europe
          </p>
          <h1 className="text-3xl font-bold tracking-tight">The Vault</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-full border border-border/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign Out
        </button>
      </header>

      {/* Tabs */}
      <div className="px-8">
        <div className="flex gap-1 rounded-full border border-border/40 bg-card/60 p-1 backdrop-blur-xl w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ${
                tab === key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              {key === 'pending' && pendingCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-8 pt-4">
        {/* Format filter */}
        <div className="flex gap-1 rounded-full border border-border/30 bg-card/40 p-1 backdrop-blur-xl">
          {([
            { key: 'all' as const, label: 'All Types' },
            { key: 'hackathon' as const, label: 'Hackathons' },
            { key: 'buildathon' as const, label: 'Buildathons' },
            { key: 'innovation_challenge' as const, label: 'Challenges' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFormatFilter(key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
                formatFilter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Prestige filter */}
        <button
          onClick={() => setPrestigeOnly(!prestigeOnly)}
          className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
            prestigeOnly
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="h-3.5 w-3.5" strokeWidth={1.5} />
          Tier-1 Only (€30k+)
        </button>
      </div>

      {/* Competition Queue */}
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <p className="py-20 text-center font-mono text-sm text-muted-foreground">Loading competitions…</p>
          ) : competitions.length === 0 ? (
            <p className="py-20 text-center text-lg text-muted-foreground">
              No {tab} competitions in The Vault.
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {competitions.map((c) => {
                const isTier1 = parsePrize(c.reward_pool) >= 30000;
                return (
                  <motion.article
                    key={c.id}
                    layout
                    variants={CARD_VARIANTS}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card shadow-md shadow-black/[0.04] will-change-transform"
                  >
                    <div className="relative flex flex-col gap-5 p-8 sm:p-10">
                      {/* Format badge + Tier-1 indicator */}
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border/40 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {FORMAT_LABELS[c.format_type]}
                        </span>
                        {isTier1 && (
                          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            <Star className="h-3 w-3" strokeWidth={2} />
                            Tier-1
                          </span>
                        )}
                      </div>

                      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        {c.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm text-muted-foreground">
                        <span>{c.exhibition_date}</span>
                        <span className="text-border">|</span>
                        <span>{c.venue_location}</span>
                        <span className="text-border">|</span>
                        <span>{c.reward_pool}</span>
                      </div>

                      {c.patron_entities && Array.isArray(c.patron_entities) && (
                        <div className="flex flex-wrap gap-3">
                          {(c.patron_entities as string[]).map((patron, i) => (
                            <span
                              key={i}
                              className="text-xs font-medium text-muted-foreground/40 transition-all duration-500 group-hover:text-muted-foreground"
                            >
                              {patron}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-2">
                        {tab === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ id: c.id, status: 'published' })}
                              className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
                            >
                              <Check className="h-4 w-4" strokeWidth={1.5} />
                              Exhibit
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: c.id, status: 'archived' })}
                              className="flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <Archive className="h-4 w-4" strokeWidth={1.5} />
                              Archive
                            </button>
                          </>
                        )}
                        {tab === 'published' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: c.id, status: 'archived' })}
                            className="flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Archive className="h-4 w-4" strokeWidth={1.5} />
                            Archive
                          </button>
                        )}
                        {tab === 'archived' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: c.id, status: 'published' })}
                            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
                          >
                            <Check className="h-4 w-4" strokeWidth={1.5} />
                            Re-Exhibit
                          </button>
                        )}
                        {c.provenance_link && (
                          <a
                            href={c.provenance_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-full border border-border/30 bg-card/50 px-5 py-2.5 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                            Provenance
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </section>
    </div>
  );
};

export default Vault;
