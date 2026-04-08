import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Archive, ExternalLink, Star, Shield, Info,
  MapPin, Calendar, Trophy, Filter, ChevronDown, Loader2
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

type ExhibitionStatus = 'pending' | 'published' | 'archived';
type CompetitionFormat = 'hackathon' | 'buildathon' | 'innovation_challenge';

const FORMAT_LABELS: Record<CompetitionFormat, string> = {
  hackathon: 'Hackathon',
  buildathon: 'Buildathon',
  innovation_challenge: 'Challenge',
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
  source_signal: string | null;
  is_remote: boolean | null;
  created_at: string;
  updated_at: string;
}

function parsePrize(pool: string): number {
  return parseInt(pool.replace(/[^0-9]/g, ''), 10) || 0;
}

const Vault = () => {
  const { user, isReady } = useAuthReady();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);
  const [tab, setTab] = useState<ExhibitionStatus>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [prestigeOnly, setPrestigeOnly] = useState(false);
  const [formatFilter, setFormatFilter] = useState<CompetitionFormat | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHandshake, setShowHandshake] = useState(false);
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
      return (data ?? []) as unknown as Competition[];
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
    if (formatFilter !== 'all') list = list.filter(c => c.format_type === formatFilter);
    if (prestigeOnly) list = list.filter(c => parsePrize(c.reward_pool) >= 30000);
    return list;
  }, [rawCompetitions, formatFilter, prestigeOnly]);

  const groupedCompetitions = useMemo(() => {
    const groups: Record<string, Competition[]> = {};
    for (const c of competitions) {
      const source = c.source_signal || 'manual';
      if (!groups[source]) groups[source] = [];
      groups[source].push(c);
    }
    return groups;
  }, [competitions]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExhibitionStatus }) => {
      const { error } = await supabase.from('competitions').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['vault-competitions'] });
      queryClient.invalidateQueries({ queryKey: ['vault-pending-count'] });
      toast.success(status === 'published' ? 'Exhibited.' : 'Archived.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isReady || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="font-mono text-xs text-muted-foreground tracking-wider">Loading Vault…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/entrance" replace />;
  if (isAdmin === false) {
    toast.error('Access restricted.');
    return <Navigate to="/" replace />;
  }

  const tabs: { key: ExhibitionStatus; label: string; count?: number }[] = [
    { key: 'pending', label: 'Inbox', count: pendingCount },
    { key: 'published', label: 'Live' },
    { key: 'archived', label: 'Archive' },
  ];

  const sourceLabels: Record<string, string> = {
    manual: 'Manual',
    unknown: 'Unknown',
    'via Devpost Intelligence': 'Devpost',
    'via Devpost': 'Devpost',
    'via Gemini Research': 'Gemini',
    'via LinkedIn': 'LinkedIn',
    'via Luma': 'Luma',
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20">
      {/* Header */}
      <header className="px-5 pt-5 pb-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.5em] text-muted-foreground/60">
          Atrium
        </p>
        <h1 className="text-lg font-bold tracking-tight">The Vault</h1>
      </header>

      {/* Status tabs */}
      <div className="px-5 pb-3">
        <div className="flex gap-1 rounded-2xl border border-border/30 bg-card/60 p-1 backdrop-blur-xl">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                tab === key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  tab === key ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter toggle */}
      <div className="px-5 pb-3 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 rounded-full border border-border/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all"
        >
          <Filter className="h-3.5 w-3.5" strokeWidth={1.5} />
          Filters
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => setShowHandshake(!showHandshake)}
          className="flex items-center gap-1.5 rounded-full border border-border/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all"
        >
          <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
          Config
        </button>
      </div>

      {/* Filters (progressive disclosure) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5"
          >
            <div className="flex flex-wrap gap-2 pb-3">
              {([
                { key: 'all' as const, label: 'All' },
                { key: 'hackathon' as const, label: 'Hackathon' },
                { key: 'buildathon' as const, label: 'Buildathon' },
                { key: 'innovation_challenge' as const, label: 'Challenge' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFormatFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    formatFilter === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setPrestigeOnly(!prestigeOnly)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  prestigeOnly
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <Star className="h-3 w-3" strokeWidth={2} />
                €30k+
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handshake notice (progressive disclosure) */}
      <AnimatePresence>
        {showHandshake && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5"
          >
            <div className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-2.5">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                <div>
                  <p className="text-xs font-medium">Handshake Config</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    Set <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">HARVESTER_SECRET</code> in{' '}
                    Cloud → Secrets. Your harvester sends this as the{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">X-Atrium-Handshake</code> header.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Competition cards */}
      <section className="flex-1 px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : competitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base text-muted-foreground">
              No {tab} competitions
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(groupedCompetitions).map(([source, items]) => (
              <div key={source}>
                {/* Source header */}
                <div className="mb-3 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
                    {sourceLabels[source] ?? source}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/60">
                    {items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((c) => {
                      const isTier1 = parsePrize(c.reward_pool) >= 30000;
                      const isExpanded = expandedId === c.id;
                      return (
                        <motion.article
                          key={c.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 60, transition: { duration: 0.3 } }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden rounded-2xl border border-border/20 bg-card shadow-sm will-change-transform"
                        >
                          {/* Card content - tap to expand */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="w-full text-left p-5"
                          >
                            {/* Top: badges */}
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                {FORMAT_LABELS[c.format_type]}
                              </span>
                              {isTier1 && (
                                <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  <Star className="h-2.5 w-2.5" strokeWidth={2} />
                                  Tier-1
                                </span>
                              )}
                              {c.is_remote && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                  Remote
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-bold tracking-tight text-foreground leading-tight">
                              {c.title}
                            </h2>

                            {/* Meta row */}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                                {c.exhibition_date}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                                {c.venue_location}
                              </span>
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} />
                                {c.reward_pool}
                              </span>
                            </div>
                          </button>

                          {/* Expanded: actions + details (progressive disclosure) */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/10 px-5 pb-5 pt-4">
                                  {/* Patrons */}
                                  {c.patron_entities && Array.isArray(c.patron_entities) && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      {(c.patron_entities as string[]).map((patron, i) => (
                                        <span key={i} className="text-[11px] text-muted-foreground/60">
                                          {patron}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Action buttons */}
                                  <div className="flex items-center gap-2">
                                    {tab === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => updateStatus.mutate({ id: c.id, status: 'published' })}
                                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-medium text-background transition-opacity active:opacity-80"
                                        >
                                          <Check className="h-4 w-4" strokeWidth={1.5} />
                                          Exhibit
                                        </button>
                                        <button
                                          onClick={() => updateStatus.mutate({ id: c.id, status: 'archived' })}
                                          className="flex items-center justify-center gap-2 rounded-xl border border-border/30 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors active:bg-muted"
                                        >
                                          <Archive className="h-4 w-4" strokeWidth={1.5} />
                                        </button>
                                      </>
                                    )}
                                    {tab === 'published' && (
                                      <button
                                        onClick={() => updateStatus.mutate({ id: c.id, status: 'archived' })}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border/30 py-3 text-sm font-medium text-muted-foreground active:bg-muted"
                                      >
                                        <Archive className="h-4 w-4" strokeWidth={1.5} />
                                        Archive
                                      </button>
                                    )}
                                    {tab === 'archived' && (
                                      <button
                                        onClick={() => updateStatus.mutate({ id: c.id, status: 'published' })}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-medium text-background active:opacity-80"
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
                                        className="flex items-center justify-center rounded-xl border border-border/30 px-4 py-3 text-muted-foreground active:bg-muted"
                                      >
                                        <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav isAdmin />
    </div>
  );
};

export default Vault;
