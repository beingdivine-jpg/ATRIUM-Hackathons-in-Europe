import { useState, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Download, Play, Eye, ArrowLeft, X, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

// The exact schema Gemini should output
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

type ColumnMapping = Record<string, string>;

interface RowValidation {
  row: Record<string, string>;
  errors: string[];
}

function tryParseDate(value: string): string | null {
  if (!value) return null;
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  // Try natural language like "April 2026"
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function validateRow(row: Record<string, string>, mapping: ColumnMapping): string[] {
  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const sourceCol = Object.entries(mapping).find(([, v]) => v === field)?.[0];
    if (!sourceCol || !row[sourceCol]?.trim()) {
      errors.push(`Missing required: ${field}`);
    }
  }
  // Validate dates
  const dateCol = Object.entries(mapping).find(([, v]) => v === 'exhibition_date')?.[0];
  if (dateCol && row[dateCol] && !tryParseDate(row[dateCol])) {
    errors.push(`Invalid date: "${row[dateCol]}"`);
  }
  const endDateCol = Object.entries(mapping).find(([, v]) => v === 'end_date')?.[0];
  if (endDateCol && row[endDateCol] && !tryParseDate(row[endDateCol])) {
    errors.push(`Invalid end date: "${row[endDateCol]}"`);
  }
  // Validate URLs
  for (const urlField of ['application_link', 'provenance_link']) {
    const col = Object.entries(mapping).find(([, v]) => v === urlField)?.[0];
    if (col && row[col]?.trim()) {
      try { new URL(row[col]); } catch {
        errors.push(`Invalid URL for ${urlField}`);
      }
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
    if (dbCol === 'exhibition_date' || dbCol === 'end_date') {
      val = tryParseDate(val as string) ?? val;
    }
    if (dbCol === 'is_remote') {
      val = ['true', '1', 'yes', 'remote'].includes((val as string).toLowerCase());
    }
    if (dbCol === 'tags') {
      val = typeof val === 'string'
        ? (val as string).split(',').map(t => t.trim()).filter(Boolean)
        : val;
    }
    if (dbCol === 'patron_entities') {
      try { val = JSON.parse(val as string); } catch { val = [val]; }
    }
    record[dbCol] = val;
  }
  // Default format_type
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
      if (alts.includes(lower)) {
        mapping[header] = dbCol;
        break;
      }
    }
    if (!mapping[header]) mapping[header] = '__skip__';
  }
  return mapping;
}

const BulkUpload = () => {
  const { user, isReady } = useAuthReady();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck(user?.id);

  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload');
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isDryRun, setIsDryRun] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; skipped: number; errors: string[] }>({ success: 0, skipped: 0, errors: [] });
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let parsed = JSON.parse(e.target?.result as string);
          // Handle { challenges: [...] } wrapper
          if (parsed.challenges && Array.isArray(parsed.challenges)) parsed = parsed.challenges;
          if (!Array.isArray(parsed)) parsed = [parsed];
          const rows = parsed.map((item: Record<string, unknown>) => {
            const flat: Record<string, string> = {};
            for (const [k, v] of Object.entries(item)) {
              flat[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
            }
            return flat;
          });
          const hdrs = [...new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r)))];
          setHeaders(hdrs);
          setRawData(rows);
          setMapping(autoMap(hdrs));
          setStep('map');
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
          setMapping(autoMap(hdrs));
          setStep('map');
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

  const validCount = validated.filter(v => v.errors.length === 0).length;
  const invalidCount = validated.length - validCount;

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);
    const validRows = validated.filter(v => v.errors.length === 0);
    const records = validRows.map(v => mapRowToRecord(v.row, mapping));
    const res = { success: 0, skipped: 0, errors: [] as string[] };

    if (isDryRun) {
      // Simulate
      for (let i = 0; i < records.length; i++) {
        await new Promise(r => setTimeout(r, 30));
        setProgress(Math.round(((i + 1) / records.length) * 100));
      }
      res.success = records.length;
      res.skipped = invalidCount;
    } else {
      // Batch upsert via provenance_link dedup
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
      res.skipped = invalidCount;
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
  };

  if (!isReady || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-sm text-muted-foreground tracking-wider">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/entrance" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground">
            Atrium Europe
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Upload</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 rounded-full">
            <Download className="h-4 w-4" strokeWidth={1.5} />
            Gemini Template
          </Button>
          <a href="/vault">
            <Button variant="ghost" size="sm" className="gap-2 rounded-full">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Back to Vault
            </Button>
          </a>
        </div>
      </header>

      {/* Gemini Prompt Hint */}
      <div className="mx-8 mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-medium text-foreground mb-1">🤖 Gemini Prompt Template</p>
        <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
          "Research upcoming European hackathons, buildathons, and innovation challenges in 2026.
          Output as JSON in this exact format: {`{ "challenges": [{ "title", "organizer", "description", "exhibition_date" (YYYY-MM-DD), "end_date", "reward_pool" (with € symbol), "venue_location", "is_remote" (boolean), "format_type" ("hackathon"|"buildathon"|"innovation_challenge"), "tags" (array), "application_link", "provenance_link", "source_signal": "via Gemini Research" }] }`}"
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <AnimatePresence mode="wait">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                className={`flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed p-16 transition-all duration-300 will-change-transform ${
                  dragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border/40 bg-card/40 hover:border-border'
                }`}
              >
                <Upload className="h-12 w-12 text-muted-foreground/40" strokeWidth={1} />
                <div className="text-center">
                  <p className="text-lg font-medium">Drop your file here</p>
                  <p className="mt-1 text-sm text-muted-foreground">Accepts .CSV and .JSON files</p>
                </div>
                <div className="flex gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,.json"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                    />
                    <span className="flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80">
                      <FileSpreadsheet className="h-4 w-4" strokeWidth={1.5} />
                      Browse CSV
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                    />
                    <span className="flex items-center gap-2 rounded-full border border-border/50 px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                      <FileJson className="h-4 w-4" strokeWidth={1.5} />
                      Browse JSON
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Column Mapping</h2>
                  <p className="text-sm text-muted-foreground">
                    {fileName} — {rawData.length} rows detected. Map your columns to the database fields.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} className="rounded-full">
                  <X className="h-4 w-4 mr-1" /> Reset
                </Button>
              </div>

              <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Source Column</TableHead>
                      <TableHead className="w-1/3">Maps To</TableHead>
                      <TableHead className="w-1/3">Sample Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headers.map((h) => (
                      <TableRow key={h}>
                        <TableCell className="font-mono text-sm">{h}</TableCell>
                        <TableCell>
                          <Select
                            value={mapping[h] || '__skip__'}
                            onValueChange={(val) => setMapping(prev => ({ ...prev, [h]: val }))}
                          >
                            <SelectTrigger className="h-9 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">— Skip —</SelectItem>
                              {DB_COLUMNS.map(col => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                  {REQUIRED_FIELDS.includes(col) ? ' *' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {rawData[0]?.[h] ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep('preview')} className="gap-2 rounded-full">
                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                  Preview & Validate
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Preview & Validate */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Validation Preview</h2>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-medium">{validCount} valid</span>
                    {invalidCount > 0 && (
                      <span className="text-destructive font-medium ml-2">{invalidCount} with errors</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setStep('map')} className="rounded-full">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      {DB_COLUMNS.filter(c => Object.values(mapping).includes(c)).map(col => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">
                          {col}
                          {REQUIRED_FIELDS.includes(col) && <span className="text-destructive ml-0.5">*</span>}
                        </TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validated.map((v, i) => {
                      const hasError = v.errors.length > 0;
                      return (
                        <TableRow key={i} className={hasError ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                          {DB_COLUMNS.filter(c => Object.values(mapping).includes(c)).map(col => {
                            const sourceCol = Object.entries(mapping).find(([, v]) => v === col)?.[0];
                            return (
                              <TableCell key={col} className="text-sm truncate max-w-[150px]">
                                {sourceCol ? v.row[sourceCol] ?? '' : ''}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            {hasError ? (
                              <div className="flex items-start gap-1.5">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" strokeWidth={1.5} />
                                <span className="text-xs text-destructive">{v.errors.join('; ')}</span>
                              </div>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/60 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm font-medium">Dry Run</span>
                    <span className="text-xs text-muted-foreground">(simulate without saving)</span>
                  </label>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || validCount === 0}
                  className="gap-2 rounded-full"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  {isDryRun ? 'Run Dry Test' : `Import ${validCount} Challenges`}
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground font-mono">{progress}%</p>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Result */}
          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 py-16"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {isDryRun ? 'Dry Run Complete' : 'Import Complete'}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-medium text-primary">{result.success} challenges</span>
                  {isDryRun ? ' validated successfully' : ' imported successfully'}
                  {result.skipped > 0 && (
                    <span className="text-destructive"> · {result.skipped} skipped due to errors</span>
                  )}
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive mb-2">Errors</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive/80">{e}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                {isDryRun && (
                  <Button
                    onClick={() => { setIsDryRun(false); setStep('preview'); }}
                    className="gap-2 rounded-full"
                  >
                    <Play className="h-4 w-4" strokeWidth={1.5} />
                    Import for Real
                  </Button>
                )}
                <Button variant="outline" onClick={reset} className="rounded-full">
                  Upload Another File
                </Button>
                <a href="/vault">
                  <Button variant="ghost" className="rounded-full">
                    Back to Vault
                  </Button>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BulkUpload;
