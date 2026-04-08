ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS organizer text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS end_date text,
  ADD COLUMN IF NOT EXISTS application_link text,
  ADD COLUMN IF NOT EXISTS tags text[];