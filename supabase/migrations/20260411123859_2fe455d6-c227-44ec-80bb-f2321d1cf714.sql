ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS series_slug text,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS editorial_summary_fr text,
  ADD COLUMN IF NOT EXISTS editorial_summary_de text,
  ADD COLUMN IF NOT EXISTS editorial_summary_es text;

CREATE INDEX IF NOT EXISTS idx_competitions_series_slug ON public.competitions (series_slug) WHERE series_slug IS NOT NULL;