import { useState, useCallback, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  Upload, FileJson, AlertTriangle, CheckCircle2,
  Download, Play, ArrowLeft, X, Loader2, Sparkles,
  ChevronDown, MapPin, Calendar, Trophy, Pencil, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import BottomNav from '@/components/BottomNav';

const GEMINI_SCHEMA = {
  challenges: [
    {
      title: "EuroHack 2026",
      organizer: "TechEU Foundation",
      description: "Pan-European hackathon focused on climate tech solutions.",
      exhibition_date: "2026-06-15",
      end_date: "2026-06-17",
      reward_pool: "€50,000",
      venue_location: "Berlin, Germany",
      is_remote: false,
      format_type: "hackathon",
      tags: ["AI", "Climate", "Web3"],
      application_link: "https://example.com/apply",
      provenance_link: "https://example.com/event",
      source_signal: "via Gemini Research"
    }
  ]
};

const DB_COLUMNS = [
  'title', 'organizer', 'description', 'exhibition_date', 'end_date',
  'reward_pool', 'venue_location', 'is_remote', 'format_type',
  'tags', 'application_link', 'provenance_link', 'source_signal',
  'patron_entities'
] as const;

const REQUIRED_FIELDS = ['title', 'exhibition_date', 'reward_pool', 'venue_location'];

const FRIENDLY_LABELS: Record<string, string> = {
  title: 'Challenge Name',
  organizer: 'Organizer',
  description: 'Description',
  exhibition_date: 'Start Date',
  end_date: 'End Date',
  reward_pool: 'Prize Pool',
  venue_location: 'Location',
  is_remote: 'Remote?',
  format_type: 'Type',
  tags: 'Tags',
  application_link: 'Apply Link',
  provenance_link: 'Source URL',
  source_signal: 'Source',
  patron_entities: 'Sponsors',
};

type ColumnMapping = Record<string, string>;

interface RowValidation {
  row: Record<string, string>;
  errors: string[];
}

function tryParseDate(value: string): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function validateRow(row: Record<string, string>, mapping: ColumnMapping): string[] {
  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const sourceCol = Object.entries(mapping).find(([, v]) => v === field)?.[0];
    if (!sourceCol || !row[sourceCol]?.trim()) {
      errors.push(`Missing: ${FRIENDLY_LABELS[field] || field}`);
    }
  }
  const dateCol = Object.entries(mapping).find(([, v]) => v === 'exhibition_date')?.[0];
  if (dateCol && row[dateCol] && !tryParseDate(row[dateCol])) {
    errors.push(`Invalid date`);
  }
  for (const urlField of ['application_link', 'provenance_link']) {
    const col = Object.entries(mapping).find(([, v]) => v === urlField)?.[0];
    if (col && row[col]?.trim()) {
      try { new URL(row[col]); } catch { errors.push(`Invalid URL`); }
    }
  }
  return errors;
}

function mapRowToRecord(row: Record<string, string>, mapping: ColumnMapping) {
  const record: Record<string, unknown> = { status: 'pending' };
  for (const [sourceCol, dbCol] of Object.entries(mapping)) {
    if (dbCol === '__skip__' || !dbCol) continue;
    let val: unknown = row[sourceCol]?.trim() ?? null;
    if (!val) continue;
    if (dbCol === 'exhibition_date' || dbCol === 'end_date') val = tryParseDate(val as string) ?? val;
    if (dbCol === 'is_remote') val = ['true', '1', 'yes', 'remote'].includes((val as string).toLowerCase());
    if (dbCol === 'tags') val = typeof val === 'string' ? (val as string).split(',').map(t => t.trim()).filter(Boolean) : val;
    if (dbCol === 'patron_entities') { try { val = JSON.parse(val as string); } catch { val = [val]; } }
    record[dbCol] = val;
  }
  if (!record.format_type || !['hackathon','buildathon','innovation_challenge'].includes(record.format_type as string)) {
    record.format_type = 'hackathon';
  }
  return record;
}

function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const aliases: Record<string, string[]> = {
    title: ['title', 'challenge name', 'name', 'event', 'challenge'],
    organizer: ['organizer', 'organiser', 'host', 'organized by'],
    description: ['description', 'desc', 'about', 'summary'],
    exhibition_date: ['exhibition_date', 'start date', 'start_date', 'date', 'begins', 'timeline_date'],
    end_date: ['end_date', 'end date', 'ends', 'deadline'],
    reward_pool: ['reward_pool', 'prize pool', 'prize', 'prizes', 'reward'],
    venue_location: ['venue_location', 'location', 'venue', 'city', 'region'],
    is_remote: ['is_remote', 'remote', 'online', 'virtual'],
    format_type: ['format_type', 'type', 'format', 'category', 'competition_type'],
    tags: ['tags', 'categories', 'topics', 'keywords'],
    application_link: ['application_link', 'apply', 'apply link', 'application url', 'registration'],
    provenance_link: ['provenance_link', 'url', 'link', 'website', 'event url'],
    source_signal: ['source_signal', 'source', 'via'],
    patron_entities: ['patron_entities', 'sponsors', 'partners', 'patrons'],
  };
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    for (const [dbCol, alts] of Object.entries(aliases)) {
      if (alts.includes(lower)) { mapping[header] = dbCol; break; }
    }
    if (!mapping[header]) mapping[header] = '__skip__';
  }
  return mapping;
}

/* ── Swipeable Review Card ── */
const ReviewCard = ({
  item,
  mapping,
  onApprove,
  onReject,
  isTop,
}: {
  item: RowValidation;
  mapping: ColumnMapping;
  onApprove: () => void;
  onReject: () => void;
  isTop: boolean;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const approveOpacity = useTransform(x, [0, 100], [0, 1]);
  const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) onApprove();
    else if (info.offset.x < -100) onReject();
  };

  const titleCol = Object.entries(mapping).find(([, v]) => v === 'title')?.[0];
  const locationCol = Object.entries(mapping).find(([, v]) => v === 'venue_location')?.[0];
  const dateCol = Object.entries(mapping).find(([, v]) => v === 'exhibition_date')?.[0];
  const prizeCol = Object.entries(mapping).find(([, v]) => v === 'reward_pool')?.[0];
  const orgCol = Object.entries(mapping).find(([, v]) => v === 'organizer')?.[0];
  const hasErrors = item.errors.length > 0;

  return (
    <motion.div
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, zIndex: isTop ? 10 : 1 }}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.6 }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.3 } }}
      className={`absolute inset-0 cursor-grab active:cursor-grabbing ${isTop ? '' : 'pointer-events-none'}`}
    >
      <div className={`h-full rounded-3xl border bg-card p-6 shadow-lg shadow-black/[0.04] ${
        hasErrors ? 'border-destructive/30' : 'border-border/30'
      }`}>
        {/* Swipe indicators */}
        <motion.div style={{ opacity: approveOpacity }}
          className="absolute inset-0 flex items-center justify-center rounded-3xl bg-primary/10 pointer-events-none">
          <div className="rounded-full bg-primary px-6 py-3 text-lg font-bold text-primary-foreground">
            ✓ Approve
          </div>
        </motion.div>
        <motion.div style={{ opacity: rejectOpacity }}
          className="absolute inset-0 flex items-center justify-center rounded-3xl bg-destructive/10 pointer-events-none">
          <div className="rounded-full bg-destructive px-6 py-3 text-lg font-bold text-destructive-foreground">
            ✕ Remove
          </div>
        </motion.div>

        <div className="relative flex h-full flex-col">
          {/* Error badge */}
          {hasErrors && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive/8 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
              <span className="text-xs font-medium text-destructive">{item.errors.join(' · ')}</span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
            {titleCol ? item.row[titleCol] || 'Untitled' : 'Untitled'}
          </h3>

          {orgCol && item.row[orgCol] && (
            <p className="mt-1 text-sm text-muted-foreground">by {item.row[orgCol]}</p>
          )}

          {/* Meta chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {dateCol && item.row[dateCol] && (
              <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                {item.row[dateCol]}
              </span>
            )}
            {locationCol && item.row[locationCol] && (
              <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                {item.row[locationCol]}
              </span>
            )}
            {prizeCol && item.row[prizeCol] && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} />
                {item.row[prizeCol]}
              </span>
            )}
          </div>

          {/* All mapped fields (progressive disclosure) */}
          <div className="mt-4 flex-1 overflow-auto space-y-2">
            {Object.entries(mapping)
              .filter(([, v]) => v !== '__skip__' && v !== 'title' && v !== 'venue_location' && v !== 'exhibition_date' && v !== 'reward_pool' && v !== 'organizer')
              .map(([srcCol, dbCol]) => (
                item.row[srcCol]?.trim() ? (
                  <div key={srcCol} className="flex items-start gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 w-16 shrink-0 pt-0.5">
                      {FRIENDLY_LABELS[dbCol] || dbCol}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.row[srcCol]}
                    </span>
                  </div>
                ) : null
              ))}
          </div>

          {/* Swipe hint */}
          {isTop && (
            <p className="mt-auto pt-4 text-center text-[11px] font-medium text-muted-foreground/50">
              ← Swipe to remove · Swipe to approve →
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Step Indicator ── */
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`h-1.5 rounded-full transition-all duration-300 ${
          i === current ? 'w-8 bg-primary' : i < current ? 'w-4 bg-primary/30' : 'w-4 bg-border'
        }`}
      />
    ))}
  </div>
);

const STEP_LABELS = ['Drop', 'Review', 'Map', 'Import'];

/* ── Main Component ── */
const BulkUpload = () => {
  const { user, isReady } = useAuthReady();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);

  const [step, setStep] = useState<'upload' | 'review' | 'map' | 'result'>('upload');
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isDryRun, setIsDryRun] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; skipped: number; errors: string[] }>({ success: 0, skipped: 0, errors: [] });
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [showMapping, setShowMapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let parsed = JSON.parse(e.target?.result as string);
          if (parsed.challenges && Array.isArray(parsed.challenges)) parsed = parsed.challenges;
          if (!Array.isArray(parsed)) parsed = [parsed];
          const rows = parsed.map((item: Record<string, unknown>) => {
            const flat: Record<string, string> = {};
            for (const [k, v] of Object.entries(item)) {
              flat[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
            }
            return flat;
          });
          const hdrs: string[] = [...new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r)))] as string[];
          setHeaders(hdrs);
          setRawData(rows);
          const m = autoMap(hdrs);
          setMapping(m);
          // Check if auto-mapping covered all required fields
          const mappedCols = new Set(Object.values(m));
          const allMapped = REQUIRED_FIELDS.every(f => mappedCols.has(f));
          setApproved(new Set());
          setRejected(new Set());
          setReviewIndex(0);
          setStep(allMapped ? 'review' : 'map');
          toast.success(`${rows.length} challenges detected`);
        } catch {
          toast.error('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    } else if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, string>[];
          const hdrs = results.meta.fields ?? [];
          setHeaders(hdrs);
          setRawData(rows);
          const m = autoMap(hdrs);
          setMapping(m);
          const mappedCols = new Set(Object.values(m));
          const allMapped = REQUIRED_FIELDS.every(f => mappedCols.has(f));
          setApproved(new Set());
          setRejected(new Set());
          setReviewIndex(0);
          setStep(allMapped ? 'review' : 'map');
          toast.success(`${rows.length} challenges detected`);
        },
        error: () => toast.error('Failed to parse CSV file.'),
      });
    } else {
      toast.error('Only .csv and .json files are supported.');
    }
  }, []);

  const validated: RowValidation[] = useMemo(() =>
    rawData.map(row => ({ row, errors: validateRow(row, mapping) })),
  [rawData, mapping]);

  // Items still in the review stack (not yet approved or rejected)
  const pendingReview = validated.filter((_, i) => !approved.has(i) && !rejected.has(i));
  const approvedItems = validated.filter((_, i) => approved.has(i));
  const validApproved = approvedItems.filter(v => v.errors.length === 0);

  const handleApprove = () => {
    const actualIndex = validated.indexOf(pendingReview[0]);
    setApproved(prev => new Set(prev).add(actualIndex));
  };

  const handleReject = () => {
    const actualIndex = validated.indexOf(pendingReview[0]);
    setRejected(prev => new Set(prev).add(actualIndex));
  };

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);
    const records = validApproved.map(v => mapRowToRecord(v.row, mapping));
    const res = { success: 0, skipped: 0, errors: [] as string[] };

    if (isDryRun) {
      for (let i = 0; i < records.length; i++) {
        await new Promise(r => setTimeout(r, 40));
        setProgress(Math.round(((i + 1) / records.length) * 100));
      }
      res.success = records.length;
      res.skipped = rejected.size;
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
      res.skipped = rejected.size;
    }
    setResult(res);
    setStep('result');
    setUploading(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(GEMINI_SCHEMA, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atrium-gemini-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setResult({ success: 0, skipped: 0, errors: [] });
    setProgress(0);
    setFileName('');
    setReviewIndex(0);
    setApproved(new Set());
    setRejected(new Set());
    setShowMapping(false);
  };

  if (!isReady || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="font-mono text-xs text-muted-foreground tracking-wider">Loading…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/entrance" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  const stepIndex = step === 'upload' ? 0 : step === 'review' ? 1 : step === 'map' ? 2 : 3;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20">
      {/* Compact header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.5em] text-muted-foreground/60">
            Atrium
          </p>
          <h1 className="text-lg font-bold tracking-tight">Upload</h1>
        </div>
        <StepIndicator current={stepIndex} total={4} />
      </header>

      {/* Step label */}
      <div className="px-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground">
          Step {stepIndex + 1} · {STEP_LABELS[stepIndex]}
        </p>
      </div>

      <div className="flex-1 px-4">
        <AnimatePresence mode="wait">

          {/* ═══ STEP 1: THE DROP ═══ */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6"
            >
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed p-12 transition-all duration-500 will-change-transform cursor-pointer ${
                  dragOver
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-border/30 bg-card/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
                {/* Pulsing icon */}
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/8">
                    <Upload className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">Upload Research</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Drop .JSON or .CSV from Gemini
                  </p>
                </div>
              </div>

              {/* Gemini hint - collapsible */}
              <details className="group rounded-2xl border border-border/20 bg-card/40 overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span className="text-sm font-medium">Gemini Prompt</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={1.5} />
                </summary>
                <div className="border-t border-border/10 px-5 py-4">
                  <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                    "Research upcoming European hackathons, buildathons, and innovation challenges in 2026.
                    Output as JSON: {`{ "challenges": [{ "title", "organizer", "description", "exhibition_date" (YYYY-MM-DD), "end_date", "reward_pool" (€), "venue_location", "is_remote", "format_type", "tags", "application_link", "provenance_link", "source_signal": "via Gemini Research" }] }`}"
                  </p>
                  <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); downloadTemplate(); }} className="mt-3 gap-2 rounded-full w-full">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Download Template
                  </Button>
                </div>
              </details>
            </motion.div>
          )}

          {/* ═══ STEP 2: THE REVIEW STACK ═══ */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4"
            >
              {/* Stats bar */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{approved.size}</span> approved ·{' '}
                  <span className="font-bold text-destructive">{rejected.size}</span> removed ·{' '}
                  <span className="text-muted-foreground">{pendingReview.length} left</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMapping(!showMapping)}
                  className="rounded-full text-xs h-8 px-3"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Mapping
                </Button>
              </div>

              {/* Inline mapping editor (progressive disclosure) */}
              <AnimatePresence>
                {showMapping && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden rounded-2xl border border-border/20 bg-card/60"
                  >
                    <div className="max-h-48 overflow-auto p-3 space-y-2">
                      {headers.map((h) => (
                        <div key={h} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-muted-foreground truncate w-24 shrink-0">{h}</span>
                          <Select
                            value={mapping[h] || '__skip__'}
                            onValueChange={(val) => setMapping(prev => ({ ...prev, [h]: val }))}
                          >
                            <SelectTrigger className="h-8 rounded-lg text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">Skip</SelectItem>
                              {DB_COLUMNS.map(col => (
                                <SelectItem key={col} value={col}>
                                  {FRIENDLY_LABELS[col]}
                                  {REQUIRED_FIELDS.includes(col) ? ' *' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Card stack */}
              {pendingReview.length > 0 ? (
                <div className="relative h-[400px]">
                  <AnimatePresence>
                    {pendingReview.slice(0, 3).map((item, i) => (
                      <ReviewCard
                        key={validated.indexOf(item)}
                        item={item}
                        mapping={mapping}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isTop={i === 0}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                /* All reviewed */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-10"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Review complete — <span className="font-bold text-foreground">{approved.size}</span> challenges ready
                  </p>
                </motion.div>
              )}

              {/* Bottom action area (thumb zone) */}
              {pendingReview.length > 0 ? (
                <div className="flex items-center justify-center gap-6 pt-2">
                  <button
                    onClick={handleReject}
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive/30 text-destructive transition-all active:scale-90 active:bg-destructive/10"
                  >
                    <Trash2 className="h-6 w-6" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-90"
                  >
                    <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center justify-center gap-2.5 rounded-xl bg-secondary/50 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    <span className="text-sm font-medium">Dry Run</span>
                    <span className="text-xs text-muted-foreground">(simulate)</span>
                  </label>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || validApproved.length === 0}
                    className="gap-2 rounded-2xl h-14 text-base font-semibold w-full"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5" strokeWidth={1.5} />
                    )}
                    {isDryRun
                      ? `Test ${validApproved.length} Challenges`
                      : `Import ${validApproved.length} Challenges`}
                  </Button>
                  {uploading && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-1.5 rounded-full" />
                      <p className="text-[10px] text-center text-muted-foreground font-mono">{progress}%</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ STEP 2.5: COLUMN MAPPING (if auto-map failed) ═══ */}
          {step === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-5"
            >
              <div>
                <h2 className="text-lg font-bold">Map Columns</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fileName} · {rawData.length} rows · Match your columns below
                </p>
              </div>

              <div className="space-y-2">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-3 rounded-xl border border-border/20 bg-card/40 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground truncate">{h}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">{rawData[0]?.[h] ?? '—'}</p>
                    </div>
                    <Select
                      value={mapping[h] || '__skip__'}
                      onValueChange={(val) => setMapping(prev => ({ ...prev, [h]: val }))}
                    >
                      <SelectTrigger className="h-9 rounded-xl w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">Skip</SelectItem>
                        {DB_COLUMNS.map(col => (
                          <SelectItem key={col} value={col}>
                            {FRIENDLY_LABELS[col]}{REQUIRED_FIELDS.includes(col) ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Thumb-zone action */}
              <div className="sticky bottom-24 pt-4">
                <Button
                  onClick={() => { setReviewIndex(0); setApproved(new Set()); setRejected(new Set()); setStep('review'); }}
                  className="gap-2 rounded-2xl h-14 text-base font-semibold w-full"
                >
                  <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                  Start Review
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: THE SUCCESS ═══ */}
          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6 pt-12"
            >
              {/* Celebratory ring */}
              <div className="relative">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
                >
                  <CheckCircle2 className="h-12 w-12 text-primary" strokeWidth={1.5} />
                </motion.div>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">
                  {isDryRun ? 'Dry Run Complete' : 'Imported'}
                </h2>
                <p className="mt-2 text-3xl font-black text-primary">
                  {result.success}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  challenges {isDryRun ? 'validated' : 'added to Vault'}
                </p>
                {result.skipped > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {result.skipped} removed during review
                  </p>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive">{e}</p>
                  ))}
                </div>
              )}

              {/* Thumb-zone actions */}
              <div className="w-full flex flex-col gap-3 pt-4">
                {isDryRun && (
                  <Button
                    onClick={() => { setIsDryRun(false); setStep('review'); }}
                    className="gap-2 rounded-2xl h-14 text-base font-semibold w-full"
                  >
                    <Play className="h-5 w-5" strokeWidth={1.5} />
                    Import for Real
                  </Button>
                )}
                <Button variant="outline" onClick={reset} className="rounded-2xl h-12 w-full">
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
