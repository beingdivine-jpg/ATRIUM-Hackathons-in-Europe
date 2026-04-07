import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Archive, ExternalLink, LogOut } from 'lucide-react';

type ExhibitionStatus = 'pending' | 'published' | 'archived';

const CARD_VARIANTS = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: 80, scale: 0.96, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const Vault = () => {
  const { user, isReady } = useAuthReady();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);
  const [tab, setTab] = useState<ExhibitionStatus>('pending');
  const queryClient = useQueryClient();

  const { data: exhibitions = [], isLoading } = useQuery({
    queryKey: ['vault-exhibitions', tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technical_exhibitions')
        .select('*')
        .eq('status', tab)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!user && isAdmin === true,
  });

  // Pending count for badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['vault-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('technical_exhibitions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: isReady && !!user && isAdmin === true,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExhibitionStatus }) => {
      const { error } = await supabase
        .from('technical_exhibitions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['vault-exhibitions'] });
      queryClient.invalidateQueries({ queryKey: ['vault-pending-count'] });
      toast.success(
        status === 'published'
          ? 'Exhibition moved to the Gallery floor.'
          : 'Exhibition archived.'
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

      {/* Exhibition Queue */}
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <p className="py-20 text-center font-mono text-sm text-muted-foreground">Loading exhibitions…</p>
          ) : exhibitions.length === 0 ? (
            <p className="py-20 text-center text-lg text-muted-foreground">
              No {tab} exhibitions in The Vault.
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {exhibitions.map((ex) => (
                <motion.article
                  key={ex.id}
                  layout
                  variants={CARD_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card shadow-md shadow-black/[0.04] will-change-transform"
                >
                  <div className="relative flex flex-col gap-5 p-8 sm:p-10">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                      {ex.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm text-muted-foreground">
                      <span>{ex.exhibition_date}</span>
                      <span className="text-border">|</span>
                      <span>{ex.venue_location}</span>
                      <span className="text-border">|</span>
                      <span>{ex.reward_pool}</span>
                    </div>

                    {ex.patron_entities && Array.isArray(ex.patron_entities) && (
                      <div className="flex flex-wrap gap-3">
                        {(ex.patron_entities as string[]).map((patron, i) => (
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
                            onClick={() => updateStatus.mutate({ id: ex.id, status: 'published' })}
                            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
                          >
                            <Check className="h-4 w-4" strokeWidth={1.5} />
                            Exhibit
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ id: ex.id, status: 'archived' })}
                            className="flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <Archive className="h-4 w-4" strokeWidth={1.5} />
                            Archive
                          </button>
                        </>
                      )}
                      {tab === 'published' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: ex.id, status: 'archived' })}
                          className="flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Archive className="h-4 w-4" strokeWidth={1.5} />
                          Archive
                        </button>
                      )}
                      {tab === 'archived' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: ex.id, status: 'published' })}
                          className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
                        >
                          <Check className="h-4 w-4" strokeWidth={1.5} />
                          Re-Exhibit
                        </button>
                      )}
                      {ex.provenance_link && (
                        <a
                          href={ex.provenance_link}
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
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>
    </div>
  );
};

export default Vault;
