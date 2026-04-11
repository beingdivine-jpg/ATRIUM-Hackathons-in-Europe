import { useState, useCallback, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileJson, CheckCircle2, Loader2,
  X, Calendar, MapPin, Trophy, ClipboardPaste,
  ChevronDown, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import BottomNav from '@/components/BottomNav';

/* ── Expected incoming JSON shape ── */
interface IncomingChallenge {
  challengeName: string;
  organizer: string;
  location: string;
  startDate: string;
  endDate: string;
  prizePool: string;
  tags: string[];
  applicationLink: string;
  shortSummary: string;
  description: string;
}

/* ── Validation ── */
interface ValidatedChallenge {
  data: IncomingChallenge;
  errors: string[];
}

function isValidDate(s: string): boolean {
  if (!s) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return !isNaN(new Date(s).getTime());
  return !isNaN(new Date(s).getTime());
}

function normalizeDate(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return s;
}

function validateChallenge(item: Record<string, unknown>): ValidatedChallenge {
  const errors: string[] = [];
  const data: IncomingChallenge = {
    challengeName: String(item.challengeName ?? '').trim(),
    organizer: String(item.organizer ?? '').trim(),
    location: String(item.location ?? '').trim(),
    startDate: String(item.startDate ?? '').trim(),
    endDate: String(item.endDate ?? '').trim(),
    prizePool: String(item.prizePool ?? '').trim(),
    tags: Array.isArray(item.tags) ? item.tags.map((t: unknown) => String(t).trim()) : [],
    applicationLink: String(item.applicationLink ?? '').trim(),
    shortSummary: String(item.shortSummary ?? '').trim(),
    description: String(item.description ?? '').trim(),
  };

  if (!data.challengeName) errors.push('Missing challenge name');
  if (!data.location) errors.push('Missing location');
  if (!data.startDate) errors.push('Missing start date');
  else if (!isValidDate(data.startDate)) errors.push('Invalid start date');
  if (data.endDate && !isValidDate(data.endDate)) errors.push('Invalid end date');
  if (!data.prizePool) errors.push('Missing prize pool');
  if (data.shortSummary && data.shortSummary.length > 60) errors.push('Summary exceeds 60 chars');

  if (data.applicationLink) {
    try { new URL(data.applicationLink); } catch { errors.push('Invalid application URL'); }
  }

  return { data, errors };
}

function isOnlineLocation(loc: string): boolean {
  const lower = loc.toLowerCase();
  return lower.includes('online') || lower.includes('remote') || lower.includes('virtual');
}

function toDbRecord(c: IncomingChallenge) {
  return {
    title: c.challengeName,
    organizer: c.organizer || null,
    venue_location: c.location,
    exhibition_date: normalizeDate(c.startDate),
    end_date: c.endDate ? normalizeDate(c.endDate) : null,
    reward_pool: c.prizePool,
    tags: c.tags.length > 0 ? c.tags : null,
    application_link: c.applicationLink || null,
    description: c.description || c.shortSummary || null,
    format_type: 'hackathon' as const,
    status: 'pending' as const,
    source_signal: 'gemini-research',
    is_remote: isOnlineLocation(c.location),
  };
}

/* ── Main Component ── */
const BulkUpload = () => {
  const { user, isReady } = useAuthReady();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);

  const [step, setStep] = useState<'input' | 'review' | 'result'>('input');
  const [challenges, setChallenges] = useState<ValidatedChallenge[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ success: 0, errors: [] as string[] });
  const [dragOver, setDragOver] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [isDryRun, setIsDryRun] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAndValidate = useCallback((raw: string) => {
    try {
      let parsed = JSON.parse(raw);
      // Handle wrapped formats
      if (parsed.challenges && Array.isArray(parsed.challenges)) parsed = parsed.challenges;
      if (!Array.isArray(parsed)) parsed = [parsed];

      const validated = (parsed as Record<string, unknown>[]).map(validateChallenge);
      setChallenges(validated);
      setRemoved(new Set());
      setStep('review');
      toast.success(`${validated.length} challenge${validated.length !== 1 ? 's' : ''} detected`);
    } catch {
      toast.error('Invalid JSON format');
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Only .json files are accepted');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => parseAndValidate(e.target?.result as string);
    reader.readAsText(file);
  }, [parseAndValidate]);

  const handlePaste = () => {
    if (!pasteValue.trim()) {
      toast.error('Paste your JSON first');
      return;
    }
    parseAndValidate(pasteValue);
  };

  const activeItems = useMemo(() =>
    challenges.filter((_, i) => !removed.has(i)),
  [challenges, removed]);

  const validItems = useMemo(() =>
    activeItems.filter(c => c.errors.length === 0),
  [activeItems]);

  const handleRemove = (globalIndex: number) => {
    setRemoved(prev => new Set(prev).add(globalIndex));
  };

  const handlePublish = async () => {
    setUploading(true);
    setProgress(0);
    const records = validItems.map(c => toDbRecord(c.data));
    const res = { success: 0, errors: [] as string[] };

    if (isDryRun) {
      for (let i = 0; i < records.length; i++) {
        await new Promise(r => setTimeout(r, 30));
        setProgress(Math.round(((i + 1) / records.length) * 100));
      }
      res.success = records.length;
    } else {
      const BATCH = 25;
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        const { error } = await supabase.from('competitions').insert(batch as never[]);
        if (error) {
          res.errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
        } else {
          res.success += batch.length;
        }
        setProgress(Math.round(Math.min(((i + BATCH) / records.length) * 100, 100)));
      }
    }

    setResult(res);
    setStep('result');
    setUploading(false);
  };

  const reset = () => {
    setStep('input');
    setChallenges([]);
    setRemoved(new Set());
    setResult({ success: 0, errors: [] });
    setProgress(0);
    setPasteValue('');
    setShowPaste(false);
    setIsDryRun(true);
  };

  if (!isReady || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/entrance" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-24">
      {/* Header */}
      <header className="px-5 pt-8 pb-6">
        <p className="text-[11px] font-medium text-muted-foreground">Admin</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-0.5">Import Challenges</h1>
      </header>

      <div className="flex-1 px-5">
        <AnimatePresence mode="wait">

          {/* ═══ STEP 1: INPUT ═══ */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-5"
            >
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-14 transition-all cursor-pointer ${
                  dragOver
                    ? 'border-foreground/40 bg-secondary/50'
                    : 'border-border hover:border-foreground/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <FileJson className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-medium">Drop .json file</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">or tap to browse</p>
                </div>
              </div>

              {/* Paste toggle */}
              <button
                onClick={() => setShowPaste(!showPaste)}
                className="flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <ClipboardPaste className="h-4 w-4" strokeWidth={1.5} />
                Paste raw JSON instead
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPaste ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>

              <AnimatePresence>
                {showPaste && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <Textarea
                      value={pasteValue}
                      onChange={(e) => setPasteValue(e.target.value)}
                      placeholder='[{ "challengeName": "...", ... }]'
                      className="min-h-[140px] rounded-2xl border-border bg-card text-[13px] font-mono resize-none"
                    />
                    <Button
                      onClick={handlePaste}
                      className="mt-3 w-full rounded-xl h-11 text-[14px] font-medium"
                    >
                      Parse JSON
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ STEP 2: REVIEW LIST ═══ */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              {/* Summary */}
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{activeItems.length}</span> challenges
                  {removed.size > 0 && <span className="text-muted-foreground/60"> · {removed.size} removed</span>}
                </p>
                <button onClick={reset} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                  Start over
                </button>
              </div>

              {/* Challenge list */}
              <div className="flex flex-col gap-3">
                <AnimatePresence>
                  {challenges.map((item, globalIndex) => {
                    if (removed.has(globalIndex)) return null;
                    const hasErrors = item.errors.length > 0;
                    return (
                      <motion.div
                        key={globalIndex}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.25 }}
                        className={`rounded-2xl border p-5 ${
                          hasErrors ? 'border-destructive/20 bg-destructive/[0.02]' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                              {item.data.challengeName || 'Untitled'}
                            </h3>
                            {item.data.organizer && (
                              <p className="text-[13px] text-muted-foreground mt-0.5">
                                {item.data.organizer}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemove(globalIndex)}
                            className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <X className="h-4 w-4" strokeWidth={2} />
                          </button>
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[12px] text-muted-foreground">
                          {item.data.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" strokeWidth={1.5} />
                              {item.data.startDate}
                            </span>
                          )}
                          {item.data.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" strokeWidth={1.5} />
                              {item.data.location}
                            </span>
                          )}
                          {item.data.prizePool && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Trophy className="h-3 w-3" strokeWidth={1.5} />
                              {item.data.prizePool}
                            </span>
                          )}
                        </div>

                        {item.data.shortSummary && (
                          <p className="text-[12px] text-muted-foreground/70 mt-2 line-clamp-1">
                            {item.data.shortSummary}
                          </p>
                        )}

                        {/* Errors */}
                        {hasErrors && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.errors.map((err, i) => (
                              <span key={i} className="text-[11px] text-destructive bg-destructive/5 px-2 py-0.5 rounded-full">
                                {err}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Bottom action area */}
              <div className="sticky bottom-24 pt-4 bg-background">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      className="rounded border-border accent-foreground"
                    />
                    <span className="font-medium">Dry run</span>
                  </label>
                </div>
                <Button
                  onClick={handlePublish}
                  disabled={uploading || validItems.length === 0}
                  className="w-full rounded-2xl h-13 text-[15px] font-semibold gap-2"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" strokeWidth={2} />
                  )}
                  {isDryRun
                    ? `Test ${validItems.length} Challenges`
                    : `Publish ${validItems.length} Challenges`}
                </Button>
                {uploading && (
                  <Progress value={progress} className="mt-2 h-1 rounded-full" />
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: RESULT ═══ */}
          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-5 pt-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground"
              >
                <CheckCircle2 className="h-10 w-10 text-background" strokeWidth={1.5} />
              </motion.div>

              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-bold tracking-tight"
                >
                  {result.success}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-[15px] text-muted-foreground mt-1"
                >
                  {isDryRun ? 'challenges validated' : 'challenges imported'}
                </motion.p>
              </div>

              {result.errors.length > 0 && (
                <div className="w-full rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-4 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-[12px] text-destructive">{e}</p>
                  ))}
                </div>
              )}

              <div className="w-full flex flex-col gap-3 pt-6">
                {isDryRun && (
                  <Button
                    onClick={() => { setIsDryRun(false); setStep('review'); }}
                    className="w-full rounded-2xl h-12 text-[15px] font-semibold"
                  >
                    Import for Real
                  </Button>
                )}
                <Button variant="outline" onClick={reset} className="w-full rounded-2xl h-12 text-[14px]">
                  Upload Another
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <BottomNav isAdmin />
    </div>
  );
};

export default BulkUpload;
